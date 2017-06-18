'use strict';

const bodyParser = require('body-parser')
const env = require('node-env-file')
const express = require('express')
const fetch = require('node-fetch')
const swaggerJSDoc = require('swagger-jsdoc')

const options = {
  swaggerDefinition: {
    info: {
      title: 'rasa-server',
      version: '1.0.0'
    },
    basePath: '/rasa-server'
  },
  apis: ['./server.js']
}

const swaggerSpec = swaggerJSDoc(options)

env(__dirname + '/.env')
const PORT = 8080
const DEFAULT_URL = process.env.RASA_SERVER_URL

let baseURL = DEFAULT_URL

const app = express()
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }))
app.use(bodyParser.json({ limit: '50mb' }))
app.disable('etag')
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.get('/', function (req, res) {
  res.send('RASA NLU Server v1.0')
})
app.get('/api-docs.json', function (req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

/**
 * @swagger
 * definitions:
 *   Entity:
 *     type: object
 *     required:
 *       - start
 *       - end
 *       - value
 *       - entity
 *     properties:
 *       start:
 *         type: integer
 *         description: The start index of the entity substring in the text
 *       end:
 *         type: integer
 *         description: The end index of the entity substring in the text
 *       value:
 *         type: string
 *         description: The entity instance or synonym
 *       entity:
 *         type: string
 *         description: The entity name
 *
 *   Example:
 *     type: object
 *     required:
 *       - text
 *       - intent
 *       - entities
 *     properties:
 *       text:
 *         type: string
 *         description: The utterance to parse.
 *       intent:
 *         type: string
 *         description: The intent of the utterance.
 *       entities:
 *         type: array
 *         description: The list of entities extracted from the utterance.
 *         items:
 *           $ref: '#/definitions/Entity'
 *
 *   DataContainer:
 *     type: object
 *     required:
 *       - common_examples
 *     properties:
 *       common_examples:
 *         type: array
 *         items:
 *           $ref: '#/definitions/Example'
 *
 *   Payload:
 *     type: object
 *     required:
 *       - rasa_nlu_data
 *     properties:
 *       rasa_nlu_data:
 *         type: object
 *         schema:
 *           $ref: '#/definitions/DataContainer'
 *
 * /train:
 *   post:
 *     description: Deploy training examples to RASA.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: workspace_id
 *         description: workspace id to use as name of model
 *         in: path
 *         required: true
 *         type: string
 *       - name: dataObject
 *         description: Training payload
 *         in: body
 *         required: true
 *         type: object
 *         schema:
 *           $ref: '#/definitions/Payload'
 *     responses:
 *       200:
 *         description: Successful request
 *       500:
 *         description: Error posting workspace to RASA
 */
app.post('/train/:workspaceId', function (req, res) {
  console.log('received body:\n', req.body)
  const workspaceId = req.params.workspaceId
  const url = baseURL + '/train?name=workspaceId'
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(req.body)
  })
    .then((resp) => resp.json())
    .then((json) => {
      res.send(json)
    })
    .catch((err) => {
      console.error('Error posting training data;', err)
      res.status(500).send({
        status: 500,
        message: 'Error posting training data'
      })
    })
})

/**
 * @swagger
 * definitions:
 *   Message:
 *     type: object
 *     required:
 *       - q
 *     properties:
 *       q:
 *         type: string
 *         description: The utterance to parse.
 *
 *   Entity:
 *     type: object
 *     properties:
 *       start:
 *         type: integer
 *         description: The start index of the entity substring in the text
 *       end:
 *         type: integer
 *         description: The end index of the entity substring in the text
 *       value:
 *         type: string
 *         description: The entity instance or synonym
 *       entity:
 *         type: string
 *         description: The entity name
 *
 *   Intent:
 *     type: object
 *     properties:
 *       confidence:
 *         type: double
 *         description: A decimal percentage that represents RASA's confidence in the intent.
 *       name:
 *         type: string
 *         description: The name of the intent.
 *
 *   ParseResponse:
 *     type: object
 *     properties:
 *       text:
 *         type: string
 *         description: The parsed utterance.
 *       entities:
 *         type: array
 *         description: The list of extracted entities.
 *         items:
 *           $ref: '#/definitions/Entity'
 *       intent:
 *         type: object
 *         description: The top scoring intent.
 *         schema:
 *           $ref: '#/definitions/Intent'
 *       intent_ranking:
 *         type: array
 *         description: The list of all matching intents.
 *         items:
 *           $ref: '#/definitions/Intent'
 *
 * /parse:
 *   post:
 *     description: Send a message to RASA.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: message
 *         description: message payload
 *         in: body
 *         required: true
 *         type: object
 *         schema:
 *           $ref: '#/definitions/Message'
 *     responses:
 *       200:
 *         description: Successful request
 *         schema:
 *           $ref: '#/definitions/ParseResponse'
 *       500:
 *         description: Invalid request
 */
app.post('/parse', function (req, res) {
  console.log('received body:\n', req.body)
  const url = baseURL + '/parse'
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(req.body)
  })
    .then((resp) => resp.json())
    .then((json) => {
      res.send(json)
    })
    .catch((err) => {
      console.error('Error posting query;', err)
      res.status(500).send({
        status: 500,
        message: 'Error posting query'
      })
    })
})

/**
 * @swagger
 * definitions:
 *   Config:
 *     type: object
 *     properties:
 *       url:
 *         type: string
 *
 * /config:
 *   post:
 *     description: Update the configuration of this proxy.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: configObject
 *         description: configuration object
 *         in: body
 *         required: true
 *         type: object
 *         schema:
 *           $ref: '#/definitions/Config'
 *     responses:
 *       200:
 *         description: Successful request
 *       500:
 *         description: Error updating config
 */
app.post('/config', function (req, res) {
  console.log('received config:\n', req.body)
  const { url } = req.body
  baseURL = url || DEFAULT_URL
  res.send({ status: 'OK' })
})

app.listen(PORT)
console.log('RASA proxy server running on port:' + PORT)
