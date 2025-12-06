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

const botAPI = "http://51.38.57.172:8030/api";

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
	
	console.log('action : ', response[0].queryResult.action);

	if(response[0].queryResult.action == 'ask.solution' && response[0].queryResult.fulfillmentText != 'category-choice'
	 && response[0].queryResult.fulfillmentText != 'problem-description' && response[0].queryResult.fulfillmentText != 'all-ok') {
		let solutions = []
		
		await axios.get(`${botAPI}/types`)
		.then(async resp =>  {
			solutions = resp.data
			var rank = 1;
			for (var i = 0; i < solutions.length; i++) {
				solutions[i].rank = rank;
				rank++;
			}
			
			let displayTypes = '\n'
			if(solutions.length > 0){
				solutions.forEach(element => {
					displayTypes+= element.rank+' - '+element.name+' \n'
				});
				await twilioClient.messages.create({
					from: to,
					to: from,
					body: "Salut, je suis Nelly. Quel évènement souhaitez-vous me rapporter ? : "+displayTypes
				});
			}else{
				await twilioClient.messages.create({
					from: to,
					to: from,
					body: "Pas de type d'évènement trouvée🤦🏿‍♂️"
				});
			}
			
		})
		.catch(async err => {
			console.error('Erreur lors de la récupération des types : ', err);
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: err.response.data.message ? `${err.response.data.message}` : "Une erreur est survenue!🤦🏿"
			});
		}); 

		res.status(200).end();
		return
	}

	if(response[0].queryResult.fulfillmentText == 'category-choice'){
		allActions.type = response[0].queryResult.queryText;
		let categories = []
				
		await axios.get(`${botAPI}/categories`)
		.then(async resp =>  {
			categories = resp.data
			let displayCategories = '\n'
			var rank = 1;
			for (var i = 0; i < categories.length; i++) {
				categories[i].rank = rank;
				rank++;
			}
			categories.forEach(element => {
				displayCategories+= element.rank+' - '+element.name+' \n'
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces catégories : '+displayCategories
			});

		})
		res.status(200).end();
		return

	}

	if(response[0].queryResult.fulfillmentText == 'gravity-choice'){
		allActions.category = response[0].queryResult.queryText;
		let gravities = []
				
		await axios.get(`${botAPI}/gravities`)
		.then(async resp =>  {
			gravities = resp.data
			let displayGravities = '\n'
			var rank = 1;
			for (var i = 0; i < gravities.length; i++) {
				gravities[i].rank = rank;
				rank++;
			}
			gravities.forEach(element => {
				displayGravities+= element.rank+' - '+element.name+' \n'
			});
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: 'Faites un choix parmi ces types de gravités : '+displayGravities
			});

		})
		res.status(200).end();
		return

	}

	if(response[0].queryResult.fulfillmentText == 'select-injuries'){
		allActions.gravity = response[0].queryResult.queryText; 
		await twilioClient.messages.create({
			from: to,
			to: from,
			body: 'Décrivez votre problème : '
		});
		res.status(200).end();
		return
	}

	let parameters = response[0].queryResult.parameters.fields;

	if(response[0].queryResult.action == 'all-right' && response[0].queryResult.allRequiredParamsPresent){
		
		let {type, category, gravity } = allActions;
		
		let payload = {type, category, gravity,
			description: parameters.description.stringValue,
			correction : parameters.correction.stringValue,
			proceedings : parameters.proceedings.stringValue,
			lostOfHumanlifes: 0,
			injuries: 0,
			phoneNumber: from.split(':')[1], platform: from.split(':')[0] };

		await axios.post(`${botAPI}/botTickets/`, payload)
		.then(async resp => {
			let newTicket = resp.data
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: `Merci,vous venez de reporter un evènement de type ${newTicket.type.name}, vous avez choisi la catégorie ${newTicket.category.name} de le type de gravité ${newTicket.gravity.name}. La description est ${newTicket.description}, les mesures prises sont ${newTicket.proceedings} et la correction proposée est ${newTicket.correction}`
			});
			res.status(200).end();
			return

		})
		.catch(async err => {
			console.error('Erreur lors de la création du ticket : ', err);
			await twilioClient.messages.create({
				from: to,
				to: from,
				body: err.response.data.message ? `${err.response.data.message}` : 'Une erreur est survenue!!'
			});
			res.status(200).end();
			return
		}); 
		
	}

	// forward dialogflow response to user
	const messages = response[0].queryResult.fulfillmentMessages;

	for (const message of messages) {
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