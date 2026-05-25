import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const productsRes = await db.query('SELECT * FROM products WHERE user_id = $1', [user.id]);
        const products = productsRes.rows;

        const insights = await Promise.all(products.map(async (product) => {
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

            // Query the true peak demand date calculated by the machine learning engine
            const maxForecastRes = await db.query(
                'SELECT ds FROM forecasts WHERE product_id = $1 ORDER BY predicted_demand DESC LIMIT 1',
                [product.id]
            );

            let peakDate = "N/A";
            if (maxForecastRes.rows.length > 0) {
                const dateObj = new Date(maxForecastRes.rows[0].ds);
                peakDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }

            return {
                productName: product.name,
                period: "Next 30 days",
                expectedDemand: `${(avgDemand * 30).toLocaleString()} units`,
                peakDate,
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
