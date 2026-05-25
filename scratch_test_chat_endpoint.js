async function testEndpoint(message, activeProduct) {
  try {
    console.log(`\nTesting message: "${message}" (active product: ${activeProduct})`);
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, product: activeProduct }),
    });
    
    if (!res.ok) {
      console.error(`HTTP Error: ${res.status}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    const data = await res.json();
    console.log("Response reply:\n", data.reply);
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

async function main() {
  // Test focused query
  await testEndpoint("Should I restock Bananas?", "Bananas");
  
  // Test global query
  await testEndpoint("What is our total inventory value? List our products.", "Bananas");
}

main();
