import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const productsRes = await db.query('SELECT * FROM products');
        const products = productsRes.rows;

        const insights = await Promise.all(products.map(async (product) => {
            // Mocking sophisticated logic for now, but this is server-side
            const forecastRes = await db.query('SELECT AVG(predicted_demand) as avg_demand FROM forecasts WHERE product_id = $1', [product.id]);
            const avgDemand = parseInt(forecastRes.rows[0].avg_demand) || 50;

            const coverageDays = Math.floor(product.stock_level / avgDemand);
            let risk = "Low";
            let riskColor = "emerald";

            if (coverageDays < 3) {
                risk = "High";
                riskColor = "red";
            } else if (coverageDays < 7) {
                risk = "Medium";
                riskColor = "amber";
            }

            return {
                productName: product.name,
                period: "Next 30 days",
                expectedDemand: `${(avgDemand * 30).toLocaleString()} units`,
                peakDate: "Feb 14, 2026", // Mock, ideally query max from forecast
                stockCoverage: `${coverageDays} days`,
                risk,
                riskColor
            };
        }));

        // Convert array to object keyed by product name for easy frontend lookup
        const insightsMap = insights.reduce((acc: Record<string, any>, curr) => {
            acc[curr.productName] = curr;
            return acc;
        }, {});

        return NextResponse.json(insightsMap);
    } catch (error) {
        console.error('Error fetching insights:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
