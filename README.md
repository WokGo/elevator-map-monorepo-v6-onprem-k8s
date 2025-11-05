# elevator-map-monorepo-v6-onprem-k8s
온프레미스 Kubernetes + Docker 기반 완전 자동 배포 버전

좋습니다. 💯
이제 바로 **`elevator-map-monorepo-v6-onprem-k8s.zip`** 전체를
GitHub Codespaces나 로컬 터미널에서 그대로 재현할 수 있는
**실제 ZIP 생성 명령 세트**로 만들어드리겠습니다.

---

# 🧩 elevator-map-monorepo-v6-onprem-k8s.zip 생성 스크립트

> 📍 사용 환경: Ubuntu / GitHub Codespaces / WSL / macOS 터미널
> 📍 실행 결과: `elevator-map-monorepo-v6-onprem-k8s.zip` 파일 자동 생성
> 📍 구성 포함: Express + React + Docker + K8s + GitHub Actions

---

## ⚙️ 1️⃣ 초기 세팅

```bash
# 프로젝트 디렉터리 생성
mkdir -p elevator-map-monorepo-v6-onprem-k8s
cd elevator-map-monorepo-v6-onprem-k8s
```

---

## ⚙️ 2️⃣ Server (Express API)

```bash
mkdir -p server
cat > server/server.js <<'EOF'
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
EOF
```

### package.json

```bash
cat > server/package.json <<'EOF'
{
  "name": "elevator-api",
  "version": "1.0.0",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "cors": "^2.8.5",
    "express": "^4.19.2"
  }
}
EOF
```

### Dockerfile

```bash
cat > server/Dockerfile <<'EOF'
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
EOF
```

---

## ⚙️ 3️⃣ Web (React / Vite)

```bash
mkdir -p web/src
cat > web/src/App.jsx <<'EOF'
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
EOF
```

### main.jsx

```bash
cat > web/src/main.jsx <<'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
```

### package.json

```bash
cat > web/package.json <<'EOF'
{
  "name": "elevator-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.1.0"
  }
}
EOF
```

### Dockerfile

```bash
cat > web/Dockerfile <<'EOF'
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

---

## ⚙️ 4️⃣ Kubernetes 설정

```bash
mkdir -p k8s
cat > k8s/namespace.yaml <<'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: elevator-map
EOF

cat > k8s/configmap.yaml <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: elevator-config
  namespace: elevator-map
data:
  ELEVATOR_API_KEY: "<YOUR_API_KEY>"
EOF

cat > k8s/deployment-api.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elevator-api
  namespace: elevator-map
spec:
  replicas: 2
  selector:
    matchLabels:
      app: elevator-api
  template:
    metadata:
      labels:
        app: elevator-api
    spec:
      containers:
      - name: api
        image: registry.local/elevator-api:latest
        ports:
        - containerPort: 4000
EOF

cat > k8s/deployment-web.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elevator-web
  namespace: elevator-map
spec:
  replicas: 2
  selector:
    matchLabels:
      app: elevator-web
  template:
    metadata:
      labels:
        app: elevator-web
    spec:
      containers:
      - name: web
        image: registry.local/elevator-web:latest
        ports:
        - containerPort: 80
EOF

cat > k8s/service-api.yaml <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: elevator-api
  namespace: elevator-map
spec:
  selector:
    app: elevator-api
  ports:
    - port: 4000
      targetPort: 4000
  type: ClusterIP
EOF

cat > k8s/service-web.yaml <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: elevator-web
  namespace: elevator-map
spec:
  selector:
    app: elevator-web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
EOF

cat > k8s/ingress.yaml <<'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: elevator-ingress
  namespace: elevator-map
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
    - host: elevator-map.click
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: elevator-web
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: elevator-api
                port:
                  number: 4000
EOF
```

---

## ⚙️ 5️⃣ GitHub Actions

```bash
mkdir -p .github/workflows
cat > .github/workflows/deploy-k8s.yml <<'EOF'
name: Deploy to OnPrem K8s
on:
  push:
    branches: [ main ]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and Push Images
        run: |
          docker build -t registry.local/elevator-api:latest ./server
          docker build -t registry.local/elevator-web:latest ./web
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login registry.local -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push registry.local/elevator-api:latest
          docker push registry.local/elevator-web:latest
      - name: Apply to K8s
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.K8S_MASTER_IP }}
          username: ${{ secrets.K8S_USER }}
          key: ${{ secrets.K8S_SSH_KEY }}
          script: |
            kubectl apply -f /opt/k8s/elevator-map/k8s/
EOF
```

---

## ⚙️ 6️⃣ 압축 생성

```bash
cd ..
zip -r elevator-map-monorepo-v6-onprem-k8s.zip elevator-map-monorepo-v6-onprem-k8s
```

---

## ✅ 실행 후 결과

```bash
✅ elevator-map-monorepo-v6-onprem-k8s.zip
   ├── server/
   ├── web/
   ├── k8s/
   ├── .github/
   └── 완성된 Docker+K8s 배포 환경
```

---

이 zip 파일은 그대로 GitHub에 push하거나
온프레미스 K8s 클러스터로 `kubectl apply -f k8s/` 명령으로 바로 배포할 수 있습니다.

---

원하신다면 다음 단계로

> `v7 — Helm + ArgoCD GitOps 구조 (자동 동기화 배포)`
> 버전으로 바로 이어서 설계해드릴까요?
> 즉, 이 Kubernetes YAML들을 Helm Chart로 묶고, ArgoCD가 Git push 시 자동 반영하는 구조입니다.

