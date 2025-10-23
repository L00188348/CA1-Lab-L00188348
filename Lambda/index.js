// Lambda function to handle RESTful API requests via API Gateway
// Author: Rômulo Azevedo (Student ID: L00188348)
// Purpose: Demonstrate how AWS CloudFormation can automate deployment of a REST API + Lambda setup

// AWS SDK and Powertools imports - ONLY ONCE at the top
const AWS = require("aws-sdk");
const { Logger } = require('@aws-lambda-powertools/logger');
const { Tracer } = require('@aws-lambda-powertools/tracer');
const { Metrics } = require('@aws-lambda-powertools/metrics');

// Initialize Powertools utilities with service name
const logger = new Logger({ 
    serviceName: 'task-service'
});
const tracer = new Tracer({ 
    serviceName: 'task-service' 
});
const metrics = new Metrics({ 
    namespace: 'TaskApp', 
    serviceName: 'task-service'
});

// Create DynamoDB client - ONLY ONCE
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Capture AWS service with tracer for X-Ray distributed tracing
tracer.captureAWSClient(dynamoDb.service);

// DynamoDB table name
const TABLE_NAME = "TasksTable";

/**
 * Main Lambda handler function
 * Processes API Gateway requests and routes to appropriate handlers
 */
exports.handler = async (event) => {
    logger.info('API Gateway Event received', { event });
    
    try {
        // Extract HTTP method and path from API Gateway event
        const httpMethod = event.httpMethod || 'GET';
        const path = event.path || '/';
        
        logger.info('Processing request', { httpMethod, path });
        
        // Route requests to appropriate handler based on HTTP method and path
        if (httpMethod === 'GET' && (path === '/tasks' || path === '/')) {
            return await handleGetTasks();
        } else if (httpMethod === 'POST' && path === '/tasks') {
            return await handleCreateTask(event);
        } else {
            // Return 404 for unsupported routes
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    message: 'Route not found',
                    path: path,
                    method: httpMethod 
                })
            };
        }
        
    } catch (err) {
        logger.error('Handler error', { 
            error: err.message,
            stack: err.stack 
        });
        
        // Enhanced error handling with specific status codes
        const statusCode = err.statusCode || 500;
        const message = statusCode === 500 ? 'Internal server error' : err.message;
        
        return {
            statusCode: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                message: message,
                // Include request ID for debugging in production errors
                ...(statusCode === 500 && { requestId: event.requestContext?.requestId })
            })
        };
    }
};

/**
 * Handles GET requests to retrieve all tasks from DynamoDB
 * @returns {Object} HTTP response with tasks array
 */
async function handleGetTasks() {
    // Perform scan operation on DynamoDB table
    const data = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
    logger.info('DynamoDB scan successful', { itemCount: data.Items.length });
    
    // Add custom metric for monitoring
    metrics.addMetric('TasksReturned', 'Count', data.Items.length);
    
    // Return successful response with CORS headers
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            tasks: data.Items || [],
            count: data.Count || 0
        })
    };
}

/**
 * Handles POST requests to create new tasks in DynamoDB
 * @param {Object} event - API Gateway event containing request body
 * @returns {Object} HTTP response with created task
 */
async function handleCreateTask(event) {
    logger.info('Creating new task', { body: event.body });
    
    // Validate request body exists
    if (!event.body) {
        throw {
            statusCode: 400,
            message: 'Missing request body'
        };
    }
    
    // Parse JSON body (handles both string and object formats)
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Validate required fields
    if (!body.taskId || !body.title) {
        throw {
            statusCode: 400, 
            message: 'Missing required fields: taskId and title'
        };
    }
    
    // Create task object with timestamps
    const task = {
        taskId: body.taskId,
        title: body.title,
        completed: body.completed || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save task to DynamoDB with condition to prevent duplicates
    await dynamoDb.put({
        TableName: TABLE_NAME,
        Item: task,
        ConditionExpression: 'attribute_not_exists(taskId)' // Prevent overwriting existing tasks
    }).promise();
    
    logger.info('Task created successfully', { taskId: body.taskId });
    
    // Add custom metric for task creation
    metrics.addMetric('TaskCreated', 'Count', 1);
    
    // Return 201 Created response
    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: 'Task created successfully',
            task: task
        })
    };
}