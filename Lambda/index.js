// Lambda function to handle RESTful API requests via API Gateway
// Author: Rômulo Azevedo (Student ID: L00188348)
// Purpose: Demonstrate how AWS CloudFormation can automate deployment of a REST API + Lambda setup

exports.handler = async (event) => {
    console.log("Incoming event:", JSON.stringify(event));
  
    // Identify the HTTP method used (GET, POST, DELETE)
    const method = event.httpMethod;
    let response;
  
    switch (method) {
      // GET: Fetch or list data 
      case "GET":
        response = {
          statusCode: 200,
          body: JSON.stringify({ message: "GET request received: listing tasks" }),
        };
        break;
  
      // POST: Create or add new data 
      case "POST":
        const body = JSON.parse(event.body || "{}");
        response = {
          statusCode: 201,
          body: JSON.stringify({
            message: "POST request received: new task created",
            task: body,
          }),
        };
        break;
  
      // DELETE: Remove an item 
      case "DELETE":
        response = {
          statusCode: 200,
          body: JSON.stringify({ message: "DELETE request received: task removed" }),
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
  