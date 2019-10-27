//Import package
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');

//PASSWORD

//funcion que genera un random salt
var genRandomString = function(length) {
	return crypto.randomBytes(Math.ceil(length/2))
		.toString('hex')
		.slice(0,length);
};

var sha512 = function(password,salt) {
	var hash = crypto.createHmac('sha512',salt);
	hash.update(password);
	var value = hash.digest('hex');
	return {
		salt:salt,
		passwordHash:value
	};
};

function saltHashPassword(userPassword) {
	var salt = genRandomString(16);
	var passwordData = sha512(userPassword,salt);
	return passwordData;
}

function checkHashPassword(userPassword,salt) {
	var passwordData = sha512(userPassword, salt);
	return passwordData;
}

//CREACION Express Service
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//CREACION MongoDB Client
var MongoClient = mongodb.MongoClient;

//Conexion URL
var url = 'mongodb+srv://ptiproyecto:ptiproyecto@cluster0-ljjks.mongodb.net/test?retryWrites=true&w=majority'        //'mongodb://localhost:27017' //27017 es el puerto por default para mongoDB

MongoClient.connect(url,{useNewUrlParser: true},function(err,client) {
	if (err)
		console.log('No se ha podido conectar. Error', err);
	else {
		//Register
		app.post('/register',(request,response,next)=>{
			var post_data = request.body;

			var plaint_password = post_data.password;
			var hash_data = saltHashPassword(plaint_password);

			var password = hash_data.passwordHash; //Guardamos el password hash
			var salt = hash_data.salt; //Guardamos el salt

			var name = post_data.name;
			var email = post_data.email;

			var insertJson = {
				'email': email,
				'password': password,
				'salt': salt,
				'name': name
			};
			var db = client.db('AlexDB');

			db.collection('login').find({'email':email}).count(function(err,number) {
				if (number != 0) {
					response.json('Email ya existe');
					console.log('Email ya existe');
				}
				else {
					//insertamos datos
					db.collection('login').insertOne(insertJson,function(error,res) {
						response.json('Registro correcto');
						console.log('Registro correcto');
					})
				}
			})
		});

		app.post('/login',(request,response,next)=>{
			var post_data = request.body;

			var email = post_data.email;
			var userPassword = post_data.password;

			var db = client.db('AlexDB');

			db.collection('login').find({'email':email}).count(function(err,number) {
				if (number == 0) {
					response.json('Email no existe');
					console.log('Email no existe');
				}
				else {
					//insertamos datos
					db.collection('login').findOne({'email':email},function(err,user) {
						var salt = user.salt; //Obtenemos salt del usuario
						var hashed_password = checkHashPassword(userPassword,salt).passwordHash;
						var encrypted_password = user.password; //Obtenemos pass del usuario
						if (hashed_password == encrypted_password) {
							response.json('Login correcto');
							console.log('Login correcto');
						}
						else {
							response.json('Contraseña incorrecta');
							console.log('Contraseña incorrecta');
						}
					})
					
				}
			})
		});

		app.post('/getContactos',(request,response,next)=>{
			var post_data = request.body;

			var user = post_data.user;

			var db = client.db('AlexDB');

			const collection = db.collection('contactos');
 
			collection.find({'user':user}).toArray(function (err, result) {
	        	if (err) {
	            	response.json(err);
	        	} 
	        	else {
              		var intCount = result.length;
              		if (intCount > 0) {
	                	var strJson = "";
	                	for (var i = 0; i < intCount;) {
	                  		strJson += '{"telf":"' + result[i].telf + '"}'
	                  		i = i + 1;
	                  		if (i < intCount) {
	                    		strJson += ',';
	                  		}
	                	}
	                	strJson = '{"telfs":[' + strJson + "]}";
						response.json(strJson);
					}
	        	}
    		});
		})

		//Start web server
		app.listen(3000, ()=> {
			console.log('Conectado con el servidor de MongoDB, Web service corriendo en el puerto 3000');
		})
	}
});