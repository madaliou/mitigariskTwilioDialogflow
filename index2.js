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

//const botAPI = "http://51.38.57.172:8002/api";

const botAPI = "http://127.0.0.1:8000/api";

// post request on /whatsapp endpoint
let allActions = {};
app.post('/whatsapp', async function(req, res) {

	// users whatsapp number
	const from = req.body.From;

	// sandbox whatsapp number
	const to = req.body.To;
	// message contents
	const body = req.body.Body;

	console.log(`Got my message ${body} from ${from}`);

	// session for current user
	const projectId = 'nokia-whatsapp-odue';
	//const projectId = 'moozi-support-m9dc';
	const sessionPath = sessionClient.projectAgentSessionPath(projectId, from);
	//try {
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
	
	console.log("Début");

	//console.log('response.queryResult.fulfillmentMessages : ', response[0].queryResult);
	let result = response[0].queryResult

	console.log('====================================');
	console.log('llll : ', response[0].queryResult);
	console.log('====================================');

	var userInput = [];

	console.log('action : ', response[0].queryResult.action);

	if(response[0].queryResult.action == 'ask.solution' && response[0].queryResult.fulfillmentText != 'category-choice'
	 && response[0].queryResult.fulfillmentText != 'problem-description' && response[0].queryResult.fulfillmentText != 'all-ok') {
		//console.log('responses : ', response);
		userInput.push(body);
		let solutions = []
		let payload = {phoneNumber: from.split(':')[1], platform: from.split(':')[0] }
		
		await axios.get(`${botAPI}/types`)
		.then(async resp =>  {
			console.log('cool bot solutions : ', resp.data);
			solutions = resp.data
			var rank = 1;
			for (var i = 0; i < solutions.length; i++) {
				solutions[i].rank = rank;
				rank++;
			}
			
			let displayTypes = '\n'
			let counter = 1;
			if(solutions.length > 0){
				solutions.forEach(element => {
					displayTypes+= element.rank+' - '+element.name+' \n'
					//counter++
				});
				await twilioClient.messages.create({
					from: to,
					to: from,
					body: "Sélectionner le type d'évènement : "+displayTypes
				});
			}else{
				await twilioClient.messages.create({
					from: to,
					to: from,
					body: "Pas de type d'évènement trouvée🤦🏿‍♂️"
				});
			}
			
			//agent.add('The Transfert is done successfully');
		})
		.catch(async err => {
			console.log('pas coolhhhh : ', err);
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: err.response.data.message ? `${err.response.data.message}` : "Une erreur est survenue!🤦🏿"
			});
		}); 

		res.status(200).end();
		return
	}
	if(response[0].queryResult.fulfillmentText == 'select-solution'){
		/*allActions.solution = response[0].queryResult.queryText;
		console.log('respo : ', response);*/
	}

	if(response[0].queryResult.fulfillmentText == 'category-choice'){
		userInput.push(body);
		allActions.type = response[0].queryResult.queryText;
		let categories = []
				
		await axios.get(`${botAPI}/categories`)
		.then(async resp =>  {
			//console.log('cool bot categories : ', resp.data);
			categories = resp.data
			let displayCategories = '\n'
			var rank = 1;
			for (var i = 0; i < categories.length; i++) {
				categories[i].rank = rank;
				rank++;
			}
			console.log(categories);
			categories.forEach(element => {
				displayCategories+= element.rank+' - '+element.name+' \n'
				//counter++
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces catégories : '+displayCategories
			});

		})
		console.log('responses : ', response[0]);
		res.status(200).end();
		return

	}

	if(response[0].queryResult.fulfillmentText == 'gravity-choice'){
		userInput.push(body);
		allActions.category = response[0].queryResult.queryText;
		let gravities = []
				
		await axios.get(`${botAPI}/gravities`)
		.then(async resp =>  {
			//console.log('cool bot gravities : ', resp.data);
			gravities = resp.data
			let displayGravities = '\n'
			var rank = 1;
			for (var i = 0; i < gravities.length; i++) {
				gravities[i].rank = rank;
				rank++;
			}
			console.log(gravities);
			gravities.forEach(element => {
				displayGravities+= element.rank+' - '+element.name+' \n'
				//counter++
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces types de gravités : '+displayGravities
			});

		})
		console.log('responses : ', response[0]);
		res.status(200).end();
		return

	}

	if(response[0].queryResult.fulfillmentText == 'select-injuries'){
		userInput.push(body);
		console.log("samedi");
		allActions.gravity = response[0].queryResult.queryText; 
		await twilioClient.messages.create({
			from: to,
			to: from,
			body: 'Décrivez votre problème : '
		});
		res.status(200).end();
		return
	}

	if(response[0].queryResult.fulfillmentText == 'all-right' ){
		
		
		//allActions.gravity == response[0].queryResult.queryText;

		console.log('allActions : ', allActions );
		let parameters = response[0].queryResult.parameters.fields;
		let {type, category, gravity } = allActions;
		console.log('tyype :', type);
		let payload = {}
		if(type == '1'){
			console.log('the type is 1');
		}
		/* if(type == '2'){
			console.log('type == 2')
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: `Il y'a t'il pertes en vie humaine ? \n 1 - Oui \n 0 - Non `
			});
			res.status(200).end();
			return
		}

		if(type == '2'){
			console.log('type == 2 encore')
			allActions.lostOfHumanlifes = response[0].queryResult.queryText; 

			await twilioClient.messages.create({
				from: to,
				to: from,
				body: `Il y'a t'il eu des blessés ? \n 1 - Oui \n 0 - Non `
			});
			res.status(200).end();
			return
		} else{ */
		console.log('type !!!= 2 ')
		payload = {type, category, gravity,
			description: parameters.description.stringValue,
			correction : parameters.correction.stringValue,
			proceedings : parameters.proceedings.stringValue,
			lostOfHumanlifes: 0,
			injuries: 0,
			phoneNumber: from.split(':')[1], platform: from.split(':')[0] };
		//}

		/* allActions.injuries = response[0].queryResult.queryText; 
		payload  = {type, category, gravity,
			description: parameters.description.stringValue,
			correction : parameters.correction.stringValue,
			proceedings : parameters.proceedings.stringValue,
			lostOfHumanlifes: allActions.lostOfHumanlifes,
			injuries: allActions.injuries,
			phoneNumber: from.split(':')[1], platform: from.split(':')[0] }; */

		/* console.log('allActions : ', allActions);*/
			console.log('payload : ', payload); 
			await axios.post(`${botAPI}/botTickets/`, payload)
			.then(async resp => {
				let newTicket = resp.data
				//console.log('cool : ', resp.data);
				//agent.add('The Transfert is done successfully');
				await twilioClient.messages.create({
					from: to,
					to: from,
					body: `Merci,vous venez de reporter un evènement de type ${newTicket.type.name}, vous avez choisi la catégorie ${newTicket.category.name} de le type de gravité ${newTicket.gravity.name}. La description est ${newTicket.description}, les mesures prises sont ${newTicket.proceedings} et la correction proposée est ${newTicket.correction}`
				});
				res.status(200).end();
				return
	
			})
			.catch(async err => {
				//console.log('pas coolhhhh : ', err.response);
				await twilioClient.messages.create({
					from: to,
					to: from,
					body: err.response.data.message ? `${err.response.data.message}` : 'Une erreur est survenue!!'
				});
				res.status(200).end();
				return
			}); 
		
	}
	
	console.log('userInput : ', userInput);

	//console.log('action 2 : ', response[0].queryResult.action);
	/* if(response[0].queryResult.action == 'ask.categorynnnn') {
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
			});

			//agent.add('The Transfert is done successfully');
		})
		.catch(err => {
			console.log('pas coolhhhh : ', err);
			
		});

		res.status(200).end();
		return

	} */
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

	//console.log('responses : ', response);

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