import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get("/api/elevators").then((res) => setData(res.data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>🏙️ Elevator Info (On-Prem K8s)</h2>
      <ul>
        {data.map((b, i) => (
          <li key={i}>
            <strong>{b.buldNm}</strong> ({b.count}대) - {b.buldNmAddr}
          </li>
        ))}
      </ul>
    </div>
  );
}
