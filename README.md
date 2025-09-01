# 📝 Novels API

A backend API for the Novel Platform, providing novel metadata and chapter retrieval.

**Repository:** [DragonBolta/novels-api](https://github.com/DragonBolta/novels-api)

## 🚀 Features

- 🗂 Serve novel metadata: title, author, tags, description, rating, likes
- 📑 Retrieve chapters for novels
- ⚡ RESTful API endpoints for frontend consumption

## 🛠 Tech Stack

- 🖥 Backend: Node.js, Express
- 💾 Database: MongoDB
- 🐳 Deployment: Docker

## 🐳 Run with Docker (Recommended)

Pull and run the latest backend image:

    # Pull the latest backend image
    docker pull alvin1212/novels:api-latest

    # Run the container
    docker run -d -p 3000:3000 --name novels-api alvin1212/novels:api-latest

- 🌐 API is available at [http://localhost:3000](http://localhost:3000)

Stop and remove the container:

    docker stop novels-api
    docker rm novels-api

## 💻 Local Development

To run the backend locally:

    # Clone the repository
    git clone https://github.com/DragonBolta/novels-api.git
    cd novels-api

    # Install dependencies
    npm install

    # Configure environment variables in a .env file (MongoDB URI, etc.)
    npm start

## 🌐 Frontend

The API is consumed by the **Novels Frontend**: [DragonBolta/novels-frontend](https://github.com/DragonBolta/novels-frontend)
