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

// Capture AWS service with tracer (optional)
tracer.captureAWSClient(dynamoDb.service);

const TABLE_NAME = "TasksTable";

exports.handler = async (event) => {
    logger.info('Event received', { event });
    
    try {
        // Scan DynamoDB table
        const data = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
        logger.info('DynamoDB scan successful', { itemCount: data.Items.length });
        
        // Add custom metric
        metrics.addMetric('TasksReturned', 'Count', data.Items.length);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tasks: data.Items || [],
                count: data.Count || 0
            })
        };
        
    } catch (err) {
        logger.error('Error fetching tasks from DynamoDB', { 
            error: err.message,
            stack: err.stack
        });
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }
};