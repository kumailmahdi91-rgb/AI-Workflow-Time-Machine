exports.handler = async (event) => {
if (event.httpMethod !== "POST") {
  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
}
const workflowData = JSON.parse(event.body || "{}");
const webhookUrl = process.env.N8N_WEBHOOK_URL;
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(workflowData)
});
const aiResult = await response.text();
if (!response.ok) {
  return {
    statusCode: 502,
   body: `n8n HTTP ${response.status}: ${aiResult}`
  };
}
return {
  statusCode: response.status,
  headers: {
    "Content-Type": "text/plain; charset=utf-8"
  },
  body: aiResult
};   
};