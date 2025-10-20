// Lambda function to handle RESTful API requests via API Gateway
// Author: Rômulo Azevedo (Student ID: L00188348)
// Purpose: Demonstrate how AWS CloudFormation can automate deployment of a REST API + Lambda setup

// AWS SDK para Node.js
const AWS = require("aws-sdk");

// Criar instância do DynamoDB DocumentClient
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Nome da tabela
const TABLE_NAME = "TasksTable";

exports.handler = async (event) => {
    console.log("Incoming event:", JSON.stringify(event));
  
    // Identify the HTTP method used (GET, POST, DELETE)
    const method = event.httpMethod;
    let response;
  
    switch (method) {
      // GET: Fetch or list data 
      case "GET":
        const data = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
        response = {
          statusCode: 200,
          body: JSON.stringify({ tasks: data.Items }),
        };
        break;      
  
   // POST: Create or add new data 
      case "POST":
        const body = JSON.parse(event.body || "{}");
        // Unique ID for task
        const taskId = Date.now().toString();
        const task = { taskId, ...body };
        // Save to DynamoDB
        await dynamoDb.put({
            TableName: TABLE_NAME,
            Item: task
        }).promise();
        response = {
        statusCode: 201,
        body: JSON.stringify({
            message: "Task created successfully",
            task, // retorna task completo com taskId
        }),
        };
        break;
  
      // DELETE: Remove an item 
      case "DELETE":
        // Request all tasks
        const items = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
        // Delete each task individually
        await Promise.all(items.Items.map(item =>
            dynamoDb.delete({
              TableName: TABLE_NAME,
              Key: { taskId: item.taskId }
            }).promise()
          ));
        response = {
          statusCode: 200,
          body: JSON.stringify({ message: "All tasks deleted" }),
        };
        break;
  
      // Any other HTTP method not supported
      default:
        response = {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  
    // Return the API Gateway-compatible response
    return {
      ...response,
      headers: { "Content-Type": "application/json" },
    };
  };
  