FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 2024

CMD ["npx", "@langchain/langgraph-cli", "dev", "--host", "0.0.0.0", "--port", "2024"]
