export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Mirumee Contact Form API</h1>
      <p>This app provides API routes for the Mirumee website.</p>
      <ul>
        <li><code>POST /api/submit-contact-form</code></li>
        <li><code>GET /api/get-pipedrive-user?userId=123</code></li>
        <li><code>GET /api/get-job-offers?company=kaiko</code></li>
        <li><code>GET /api/calendar?to=123</code></li>
      </ul>
    </div>
  );
}
