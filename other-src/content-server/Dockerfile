# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /content-server

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

RUN npm install -g ts-node

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["yarn", "server:dev"]

