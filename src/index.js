const ws = require("websocket");
const config = require("../config.json");
const querystring = require("querystring");
const axios = require("axios");

class Client {
	constructor(config) {
		this.config = config;
		this.rooms = [];
		this.assertion = "";
		this.queue = Promise.resolve();
		this.connection = null;
		this.spam = this.spam.bind(this);
		this.report = this.report.bind(this);
	}

	connect() {
		const client = new ws.client();
		client.on('connect', this.onConnect.bind(this));
		client.on('connectFailed', this.onConnectionFailure.bind(this));
		client.connect("ws://sim.smogon.com:8000/showdown/websocket", []);
	}

	onConnect(connection) {
		this.connection = connection;
		const onConnectionFailure = this.onConnectionFailure.bind(this);
		connection.on('error', onConnectionFailure);
		connection.on('close', onConnectionFailure);
		connection.on('message', this.onMessage.bind(this));

		console.info('Connected to Showdown server');
	}

	onConnectionFailure(error) {
		console.error('Error occured (%s), will attempt to resconnect in a minute', error);
		setTimeout(this.connect.bind(this), 60000); //a minute
	}

	onMessage(message) {
		if (message.type !== 'utf8' || !message.utf8Data) return;
		const data = message.utf8Data;
		const parts = data.split('|');

		if (parts[1] === 'challstr') {
			this.onChallstr(parts);
		} else if (parts[1] === 'queryresponse') {
			this.onQueryResponse(parts);
		} else {
			this.onSomething(parts);
		}
		/*else if (parts[1] === 'queryresponse') {
			this.onQueryresponse(parts);
		} else if (parts[1] === 'error') {
			console.error(new Error(parts[2]));
		} else if (CHAT.has(parts[1])) {
			this.onChat(parts);
		}*/
	}

	onSomething(parts) {
		console.log("Something is here");
		console.log(parts);
	}

	async onChallstr(parts) {
		const id = parts[2];
		const str = parts[3];

		const url = "https://play.pokemonshowdown.com/~~showdown/action.php";
		const data = querystring.stringify({
			act: 'login',
			challengekeyid: id,
			challenge: str,
			name: this.config.nickname,
			pass: this.config.password,
		});

		try {
			var response = await axios.post(url, data);
			this.assertion = JSON.parse(response.data.replace(/^]/, ''));
			console.log(this.assertion);
			this.speak();
		} catch (err) {
			console.error(err);
			this.onChallstr(parts);
		}
	}

	// this might have many functions
	// search rooms and try to get into 
	onQueryResponse(parts) {
		if (parts[2] == "roomlist") { // this means i'm searching for rooms
			console.log(parts[3]);
			let arraygames = Object.entries(JSON.parse(parts[3]).rooms);
			console.log(arraygames);
			// do one for now
			let [somekey, somevalue] = arraygames[0];
			this.goGame(somekey);
			// for (const [key, value] of arraygames) {
			// 	console.log(key);
			// 	console.log(value);
			// }

			console.log()

		}
		console.log(parts);
	}

	goGame(id) {
		// enter the game from here
	}

	speak() {
		console.log(this.assertion.assertion);
		this.report(`|/trn huhst,0,${this.assertion.assertion}`.replace(/\n/g, ''));
		// this.report(`|/join lobby`);
		this.report(`|/pm huhst, new`);
		// this.spam();
		this.findGames();
	}

	findGames() {
		this.report(`|/cmd roomlist gen8ou,1500,`)

	}

	spam() {
		this.report(`lobby|/pm huhst, spambot for now...`);
		setTimeout(this.spam, 1000);
	}

	report(message) {
		this.queue = this.queue.then(() => {
			this.connection.send(`${message}`);
			return new Promise(resolve => {
				console.log("done");
				setTimeout(resolve, 100);
			});
		});
	}
}

new Client(config).connect();