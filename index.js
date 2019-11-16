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
var url = 'mongodb://localhost:27017' //27017 es el puerto por default para mongoDB

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

			var email = post_data.email;
			var user = post_data.user;

			var insertJson = {
				'user': user,
				'password': password,
				'salt': salt,
				'email': email
			};
			var db = client.db('AlexDB');

			db.collection('login').find({'user':user}).count(function(err,number) {
				if (number != 0) {
					response.json('User ya existe');
					console.log('User ya existe');
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

			var user = post_data.user;
			var userPassword = post_data.password;

			var db = client.db('AlexDB');

			db.collection('login').find({'user':user}).count(function(err,number) {
				if (number == 0) {
					response.json('La cuenta que intenta ingresar, no existe');
					console.log('La cuenta que intenta ingresar, no existe');
				}
				else {
					db.collection('login').findOne({'user':user},function(err,user) {
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
	            	response.json('No hay contactos')
	        	} 
	        	else {
              		var intCount = result.length;
              		if (intCount > 0) {
	                	var strJson = "";
	                	strJson += '{"telf":"' + result[0].telf + '"}'
						response.json(strJson);
					}
					else response.json('No hay contactos')
	        	}
    		});
		})

		app.post('/addContacto',(request,response,next)=>{
			var post_data = request.body;

			var user = post_data.user;
			var telf = post_data.telf;

			var insertJson = {
				'user': user,
				'telf': telf
			};

			var db = client.db('AlexDB');
			
			db.collection('contactos').find({'user':user}).count(function(err,number) {
				if (number != 0) {
					//modifico si existe ya el usuario en la collection
					db.collection('contactos').update({'user':user},insertJson,function(error,res) {
						if (error) throw error;
						response.json('Contacto modificado correctamente');
						console.log('Contacto modificado correctamente');
					})
				}
				else {
					//inserto el usuario y el telf nuevo
					db.collection('contactos').insertOne(insertJson,function(error,res) {
						response.json('Contando registrado correctamente');
						console.log('Contando registrado correctamente');
					})
				}
			})
		})

		//Start web server
		app.listen(3000, ()=> {
			console.log('Conectado con el servidor de MongoDB, Web service corriendo en el puerto 3000');
		})
	}
});