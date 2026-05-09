FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the files
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start the development server with host mapping
CMD ["npm", "run", "dev", "--", "--host"]
