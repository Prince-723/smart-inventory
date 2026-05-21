import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async function getProductContext(productName: string) {
  try {
    // 1. Get Product Details
    const productRes = await db.query('SELECT * FROM products WHERE name = $1', [productName]);
    const product = productRes.rows[0];

    if (!product) return null;

    // 2. Get Recent Transactions (Last 5)
    // Querying by product_id derived from the first query
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
    // We need to join because alerts might not have product_id in the original schema plan if they were generic,
    // but based on my earlier fix they do, or we query by name if schema was strict.
    // However, in my verify step earlier I saw alerts had product_id.
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

// Helper to get all product names
async function getAllProductNames() {
  try {
    const res = await db.query('SELECT name FROM products');
    return res.rows.map(r => r.name);
  } catch (e) {
    console.error("Error fetching product names", e);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const allProductNames = await getAllProductNames();
    const productsToFetch = new Set<string>();

    // Always fetch current product
    productsToFetch.add(product);

    // Check message for other products (case-insensitive check)
    allProductNames.forEach(name => {
      if (message.toLowerCase().includes(name.toLowerCase())) {
        productsToFetch.add(name);
      }
    });

    // 2. Fetch Context for ALL identified products
    const contextPromises = Array.from(productsToFetch).map(async (pName) => {
      const data = await getProductContext(pName);
      return { name: pName, data };
    });

    const contexts = await Promise.all(contextPromises);

    // 3. Format Context String
    let contextString = "REAL-TIME DATA CONTEXT:\n";
    contexts.forEach(c => {
      if (c.data) {
        contextString += `\n--- PRODUCT: ${c.name} ---\n${JSON.stringify(c.data, null, 2)}\n`;
      } else {
        contextString += `\n--- PRODUCT: ${c.name} ---\n(Data not available)\n`;
      }
    });

    const systemPrompt = `You are an AI inventory assistant helping with demand forecasting, trend analysis, and inventory management. 
You have access to real-time data for the products relevant to the user's query.

${contextString}

Instructions:
1. Answer the user's question based ONLY on the provided data context.
2. If comparing products, explicitly cite data points from both.
3. If the user asks about a product not in the authenticated list, politely say you don't have data for it.
4. Keep responses professional, concise, and data-driven.`;

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
