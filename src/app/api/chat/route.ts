import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async function getProductContext(productName: string, userId: number) {
  try {
    // 1. Get Product Details scoped to user
    const productRes = await db.query('SELECT * FROM products WHERE name = $1 AND user_id = $2', [productName, userId]);
    const product = productRes.rows[0];

    if (!product) return null;

    // 2. Get Recent Transactions (Last 5) - since product is scoped to user, product.id is safe
    const transactionsRes = await db.query(`
        SELECT type, quantity, description, created_at as timestamp 
        FROM transactions 
        WHERE product_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
    `, [product.id]);

    // 3. Get Forecasts (Next 5 days)
    const forecastsRes = await db.query(`
        SELECT date, predicted_demand, confidence_score, lower_bound, upper_bound
        FROM forecasts 
        WHERE product_id = $1 
        AND date >= CURRENT_DATE
        ORDER BY date ASC 
        LIMIT 5
    `, [product.id]);

    // 4. Get Active Alerts
    const alertsRes = await db.query(`
        SELECT type, message, severity, created_at
        FROM alerts 
        WHERE product_id = $1 
        ORDER BY created_at DESC
        LIMIT 3
    `, [product.id]);

    return {
      product,
      recentTransactions: transactionsRes.rows,
      forecasts: forecastsRes.rows,
      alerts: alertsRes.rows
    };
  } catch (error) {
    console.error("Error fetching context:", error);
    return null;
  }
}

// Helper to get all product names scoped to user
async function getAllProductNames(userId: number) {
  try {
    const res = await db.query('SELECT name FROM products WHERE user_id = $1', [userId]);
    return res.rows.map(r => r.name);
  } catch (e) {
    console.error("Error fetching product names", e);
    return [];
  }
}

// Helper to get global high-level inventory summary and alerts scoped to user
async function getGlobalInventoryContext(userId: number) {
  try {
    // 1. Get all products list for this user
    const productsRes = await db.query(`
        SELECT id, name, category, stock_level, reorder_point, price 
        FROM products 
        WHERE user_id = $1
        ORDER BY name ASC
    `, [userId]);
    const products = productsRes.rows;

    // 2. Get active alerts scoped to this user
    const alertsRes = await db.query(`
        SELECT a.type, a.message, a.severity, a.created_at, p.name as product_name 
        FROM alerts a 
        LEFT JOIN products p ON a.product_id = p.id 
        WHERE a.product_id IS NULL OR p.user_id = $1
        ORDER BY a.created_at DESC 
        LIMIT 10
    `, [userId]);
    const alerts = alertsRes.rows;

    // 3. Calculate summary metrics
    const totalProducts = products.length;
    let totalStockUnits = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const stock = Number(p.stock_level) || 0;
      const price = Number(p.price) || 0;
      const reorder = Number(p.reorder_point) || 0;

      totalStockUnits += stock;
      totalInventoryValue += (stock * price);
      if (stock < reorder) {
        lowStockCount++;
      }
    });

    return {
      summary: {
        totalUniqueProducts: totalProducts,
        totalStockUnits,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        lowStockCount,
      },
      allProducts: products,
      allActiveAlerts: alerts
    };
  } catch (error) {
    console.error("Error fetching global context:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, product } = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      )
    }

    if (!message || !product) {
      return NextResponse.json(
        { error: "Message and product are required" },
        { status: 400 }
      )
    }

    // 1. Identify which products to fetch context for
    const allProductNames = await getAllProductNames(user.id);
    const productsToFetch = new Set<string>();

    // Always fetch currently selected active product if it belongs to user
    const checkProduct = await db.query('SELECT 1 FROM products WHERE name = $1 AND user_id = $2', [product, user.id]);
    if (checkProduct.rows.length > 0) {
      productsToFetch.add(product);
    }

    // Check message for other products explicitly mentioned by name (case-insensitive check)
    let productMentionedInMessage = false;
    allProductNames.forEach(name => {
      if (message.toLowerCase().includes(name.toLowerCase())) {
        productMentionedInMessage = true;
        productsToFetch.add(name);
      }
    });

    // Determine if we need global inventory context
    const generalKeywords = ["all", "inventory", "summary", "total", "overall", "low", "stock", "overview", "list", "value", "alerts", "compare", "comparison", "forecasts", "metrics"];
    const isGeneralQuery = !productMentionedInMessage || generalKeywords.some(keyword => message.toLowerCase().includes(keyword));

    // 2. Fetch context in parallel
    const [contexts, globalContextData] = await Promise.all([
      // Fetch detailed contexts for the target products
      Promise.all(
        Array.from(productsToFetch).map(async (pName) => {
          const data = await getProductContext(pName, user.id);
          return { name: pName, data };
        })
      ),
      // Fetch global context if the query warrants it
      isGeneralQuery ? getGlobalInventoryContext(user.id) : Promise.resolve(null)
    ]);

    // 3. Format Context String
    let contextString = "REAL-TIME DATA CONTEXT:\n";
    
    // Inject global inventory details if present
    if (globalContextData) {
      contextString += `\n--- GLOBAL SYSTEM INVENTORY OVERVIEW (ALL PRODUCTS & ALERTS) ---\n${JSON.stringify(globalContextData, null, 2)}\n`;
    }

    // Inject deep individual product profiles
    contexts.forEach(c => {
      if (c.data) {
        contextString += `\n--- DETAILED PRODUCT PROFILE: ${c.name} ---\n${JSON.stringify(c.data, null, 2)}\n`;
      } else {
        contextString += `\n--- DETAILED PRODUCT PROFILE: ${c.name} ---\n(Detailed profile data not available)\n`;
      }
    });

    const systemPrompt = `You are an AI inventory assistant helping with demand forecasting, trend analysis, and inventory management. 
You have access to real-time data for the products relevant to the user's query.

${contextString}

Instructions:
1. Answer the user's question based ONLY on the provided data context.
2. If comparing products, explicitly cite data points from both.
3. If the user asks about a product not in the database and not present in the context, politely say you don't have data for it.
4. Keep responses professional, concise, and data-driven. 
5. When asked for inventory lists, value summaries, comparison charts, or lists of low stock, use clear Markdown formatting, bullet points, or tables where appropriate to make it highly readable and elegant.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser: ${message}`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Gemini API error:", error)
      return NextResponse.json(
        { error: "Failed to get response from Gemini API" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract text from the response
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response. Please try again."

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
