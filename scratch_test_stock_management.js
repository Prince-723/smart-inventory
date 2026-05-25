// Node 18+ global fetch
async function testAddProduct() {
  console.log("\n--- Testing Add Product ---");
  const res = await fetch("http://localhost:3000/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Blueberries",
      category: "Produce",
      price: 3.50,
      reorder_point: 40,
      initial_stock: 120
    })
  });
  
  const data = await res.json();
  console.log("Add Product response status:", res.status);
  console.log("Add Product response data:", JSON.stringify(data, null, 2));
  return data.product ? data.product.id : null;
}

async function testAdjustStock(productId) {
  console.log("\n--- Testing Adjust Stock (INBOUND) ---");
  const res = await fetch("http://localhost:3000/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productId,
      type: "INBOUND",
      quantity: 30,
      description: "Restocking Blueberries"
    })
  });
  
  const data = await res.json();
  console.log("Adjust Stock Inbound status:", res.status);
  console.log("Adjust Stock Inbound data:", JSON.stringify(data, null, 2));

  console.log("\n--- Testing Adjust Stock (OUTBOUND) ---");
  const resOut = await fetch("http://localhost:3000/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productId,
      type: "OUTBOUND",
      quantity: 50,
      description: "Sales of Blueberries"
    })
  });
  
  const dataOut = await resOut.json();
  console.log("Adjust Stock Outbound status:", resOut.status);
  console.log("Adjust Stock Outbound data:", JSON.stringify(dataOut, null, 2));
}

async function testDeleteProduct(productId) {
  console.log("\n--- Testing Delete Product ---");
  const res = await fetch(`http://localhost:3000/api/products/${productId}`, {
    method: "DELETE"
  });
  
  const data = await res.json();
  console.log("Delete Product response status:", res.status);
  console.log("Delete Product response data:", JSON.stringify(data, null, 2));
}

async function main() {
  const newProductId = await testAddProduct();
  if (newProductId) {
    await testAdjustStock(newProductId);
    await testDeleteProduct(newProductId);
  } else {
    console.error("Failed to add product, skipping adjust & delete tests.");
  }
}

main();
