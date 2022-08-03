// load variables from .env file in process.env
require('dotenv').config();

// create express server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;
const axios = require('axios')

// parse request body
// twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

// create twilio client for interacting with twilio
const twilioClient = require('twilio')(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
);

// create dialogflow session client
const dialogflow = require('@google-cloud/dialogflow');
const sessionClient = new dialogflow.SessionsClient();

const botAPI = "http://51.38.57.172:8002/api";

// post request on /whatsapp endpoint
let allActions = {};
app.post('/whatsapp', async function(req, res) {

	// users whatsapp number
	const from = req.body.From;

	// sandbox whatsapp number
	const to = req.body.To;
	// message contents
	const body = req.body.Body;

	console.log(`Got message ${body} from ${from}`);

	// session for current user
	///const projectId = 'nokia-whatsapp-odue';
	const projectId = 'moozi-support-m9dc';
	const sessionPath = sessionClient.projectAgentSessionPath(projectId, from);

	// request dialogflow to classify intent
	const response = await sessionClient.detectIntent({
		session: sessionPath,
		queryInput: {
			text: {
				text: body,
				languageCode: 'fr-FR',
			}
		}
	});

	//console.log('response.queryResult.fulfillmentMessages : ', response[0].queryResult);
	let result = response[0].queryResult

	if(result.action ==='transvie-bug' && result.allRequiredParamsPresent){

		const solution = result.parameters.fields.solution.numberValue;

        const category = result.parameters.fields.category.numberValue;

        const description = result.parameters.fields.description.stringValue;
		
		let payload = {solution, category, description, phoneNumber: from.split(':')[1], platform: from.split(':')[0] }

		//console.log('poayload : ', payload);

		await axios.post(`${botAPI}/botTickets/`, payload)
		.then(resp => {
			console.log('cool : ', resp.data);
			//agent.add('The Transfert is done successfully');
		})
		.catch(err => {
			console.log('pas coolhhhh : ', err.response);
			
			//agent.add( err.response.data.message ? `${err.response.data.message}` : 'An error occured!!');
		});

	}

	if(result.action ==='all.in.one' && result.allRequiredParamsPresent){

		const solution = result.parameters.fields.solution.numberValue;

        const category = result.parameters.fields.category.numberValue;

        const description = result.parameters.fields.description.stringValue;
		
		let payload = {solution, category, description, phoneNumber: from.split(':')[1], platform: from.split(':')[0] }

		console.log('poooayload : ', payload);

		await axios.post(`${botAPI}/botTickets/`, payload)
		.then(async resp => {
			console.log('cool : ', resp.data);
			//agent.add('The Transfert is done successfully');
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: `Merci, vous avez choisi la catégorie ${category} de la  solution ${solution}. Un technicien vous contactera dans les brefs délais pour résoudre votre problème!`
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});
		})
		.catch(async err => {
			console.log('pas coolhhhh : ', err.response);
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: err.response.data.message ? `${err.response.data.message}` : 'Une erreur est survenue!!'
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});
			
			//agent.add( err.response.data.message ? `${err.response.data.message}` : 'An error occured!!');
		});

	}

	console.log('action : ', response[0].queryResult.action);

	if(response[0].queryResult.action == 'ask.solution' && response[0].queryResult.fulfillmentText != 'category-choice'
	 && response[0].queryResult.fulfillmentText != 'problem-description' && response[0].queryResult.fulfillmentText != 'all-ok') {
		console.log('responses : ', response);
		let solutions = []

		await axios.get(`${botAPI}/botSolutions`)
		.then(async resp =>  {
			//console.log('cool bot solutions : ', resp.data);
			solutions = resp.data
			let displaySolutions = '\n'
			let counter = 1;
			solutions.reverse().forEach(element => {
				displaySolutions+= counter+' - '+element.name+' \n'
				counter++
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces solutions : '+displaySolutions
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});
			//agent.add('The Transfert is done successfully');
		})
		.catch(async err => {
			console.log('pas coolhhhh : ', err);
			
			//agent.add( err.response.data.message ? `${err.response.data.message}` : 'An error occured!!');
		});

		res.status(200).end();
		return
	}
	if(response[0].queryResult.fulfillmentText == 'select-solution'){
		/*allActions.solution = response[0].queryResult.queryText;
		console.log('respo : ', response);*/
	}

	if(response[0].queryResult.fulfillmentText == 'category-choice'){
		allActions.solution = response[0].queryResult.queryText;
		let categories = []
				
		await axios.get(`${botAPI}/categories`)
		.then(async resp =>  {
			//console.log('cool bot categories : ', resp.data);
			categories = resp.data
			let displayCategories = '\n'
			let counter = 1;
			categories.reverse().forEach(element => {
				displayCategories+= counter+' - '+element.name+' \n'
				counter++
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces catégories : '+displayCategories
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});

		})
		console.log('responses : ', response);
		res.status(200).end();
		return

	}

	if(response[0].queryResult.fulfillmentText == 'problem-description'){
		allActions.category = response[0].queryResult.queryText; 
		await twilioClient.messages.create({
			from: to,
			to: from,
			body: 'Décrivez votre problème'
			//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
		});
		res.status(200).end();
		return
	}

	if(response[0].queryResult.fulfillmentText == 'all-ok'){
		allActions.description == response[0].queryResult.queryText;
		
		let {solution, category, description } = allActions;
		let payload = {solution, category, description: req.body.Body, phoneNumber: from.split(':')[1], platform: from.split(':')[0] };
		console.log('payload : ', payload);
		console.log('allActions : ', allActions);
		await axios.post(`${botAPI}/botTickets/`, payload)
		.then(async resp => {
			console.log('cool : ', resp.data);
			//agent.add('The Transfert is done successfully');
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: `Merci, vous avez choisi la catégorie ${allActions.category} de la  solution ${allActions.solution}. Un technicien vous contactera dans les brefs délais pour résoudre votre problème!`
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});
		})
		.catch(async err => {
			//console.log('pas coolhhhh : ', err.response);
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: err.response.data.message ? `${err.response.data.message}` : 'Une erreur est survenue!!'
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});
			//agent.add( err.response.data.message ? `${err.response.data.message}` : 'An error occured!!');
		});
	}
	
	console.log('responses : ', response);

	//console.log('action 2 : ', response[0].queryResult.action);
	if(response[0].queryResult.action == 'ask.categorynnnn') {
		let categories = []
		await axios.get(`${botAPI}/categories`)
		.then(async resp =>  {
			//console.log('cool : ', resp.data);
			categories = resp.data
			let displayCategories = '\n'
			categories.reverse().forEach(element => {
				displayCategories+= element.id+' - '+element.name+' \n'
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces catégories : '+displayCategories
				//body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
			});

			//agent.add('The Transfert is done successfully');
		})
		.catch(err => {
			console.log('pas coolhhhh : ', err);
			
			//agent.add( err.response.data.message ? `${err.response.data.message}` : 'An error occured!!');
		});

		res.status(200).end();
		return

	}

	console.log('action 3 : ', response[2].queryResult.action);

	// handle emi due date action
	if(response[0].queryResult.action == 'emi.due-date') {
		// fake emi date and amount
		let dueDate = new Date();
		dueDate.setTime(dueDate.getTime() + 5*24*60*60*1000);
		let dueAmount = "$200";

		// respond to userf
		await twilioClient.messages.create({
			from: to,
			to: from,
			body: `Your next emi of ${dueAmount} is on ${dueDate.toDateString()}.`
		});

		res.status(200).end();
		return
	}

	console.log('responses : ', response);

	// forward dialogflow response to user
	const messages = response[0].queryResult.fulfillmentMessages;

	//console.log('messages : ', messages);

	for (const message of messages) {
		//console.log('one message : ', message);
		// normal text message
		if(message.text) {
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: message.text.text[0],
			});
		}
	}

	// respond to twilio callback
	res.status(200).end();
});

// start server
app.listen(PORT, () => {
	console.log(`Listening on ${PORT}`);
});