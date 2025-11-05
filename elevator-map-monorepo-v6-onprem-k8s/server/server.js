import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/elevators", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://apis.data.go.kr/B552584/ElevatorInformationService/getElevatorList",
      {
        params: {
          serviceKey: process.env.ELEVATOR_API_KEY,
          _type: "json",
          numOfRows: 50,
          pageNo: 1,
          sigunguCd: "41110"
        }
      }
    );

    const items = data?.response?.body?.items?.item || [];
    const grouped = {};
    for (const e of items) {
      const name = e.buldNm;
      if (!grouped[name])
        grouped[name] = {
          buldNm: name,
          buldNmAddr: e.buldNmAddr,
          latitude: e.latitude || 37.2636,
          longitude: e.longitude || 127.0286,
          count: 0
        };
      grouped[name].count++;
    }
    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "API fetch error" });
  }
});

app.listen(4000, () => console.log("✅ Elevator API on port 4000"));
