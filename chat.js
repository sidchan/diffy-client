var webSocketServer=require("websocket").server;
var http=require("http");
var Client=require("mysql").Client;
var sqlClient=new Client();
sqlClient.user="root";
sqlClient.pass="";
sqlClient.query("USE diffHub",function(error,results){
	if(error)
	{
		console.log("Error in connecting to database "+error.message);
		return;
	}
	console.log("Successfully connected to database");
});
function idGenerate()
{
    var unique;                                                                                                                        
    do                                                                                                                                          
    {
	var keys="abcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";  
	size=1+Math.floor(Math.random()*10);
	var workId="";
	for(i=0;i<size;i++)
	{                                                                             
	    var num=Math.floor(Math.random()*keys.length);                                              
	    workId+=keys.substring(num,num+1);                                                         
	}            
	sqlClient.query("SELECT * FROM workspacelist WHERE workspaceid=?",[workId],function(error,results){   
	    if(error)                                                   
	    {                                               
		console.log("Error in SELECT query inside workGenerator "+error.message);
		return;                                                                                                           
	    }                                                                                                    
	    if(results.length==0)                                                                      
		unique=0;                                                                                         
	    else                            
		unique=1;                                                                         
	});                                                             
    }                                                       
    while(unique==1);                                                                   
    return workId;                                                                                                                          
}
var server=http.createServer(function(request,response){
});
var clients=[];
server.listen(8080,function(){
	console.log("Server is running on port 8080");
}); 
var wsServer=new webSocketServer({httpServer : server});
wsServer.on('request',function(request){
		var connection = request.accept(null,request.origin); 
		console.log("received a request from "+request.origin);
		connection.on('message',function(message){
			console.log("before "+message);
			message=eval(message);
			var obj=message['utf8Data'];
			obj=obj.split(",");
			tmp=[];
			for(i in obj){
				tmp.push(obj[i].split(":"))
			}
			action=tmp[0][1];
			if(action=='"chat"')
			{
				var workSpaceId=obj.workspace;
				var data=obj.data;
				console.log(obj);
				clients[workSpaceId].push(connection);
				for(var i=0;i<clients.length;i++);
					clients[i].sendUTF(data);
			}
			else if(action=='"login"')
			{
				console.log(action);
				var uname=tmp[1][1];
				uname=uname.slice(1,uname.length-1);
				var pass=tmp[2][1];
				pass=pass.slice(1,pass.length-2);
				console.log("login request recieved");
				console.log(uname+" "+pass);
				var workId="0";
				sqlClient.query("SELECT * FROM userdetails WHERE username=? AND password=md5(?)",[uname,pass],function(error,results){
				if(error)
				{
					console.log("Error in SELECT query for checking logged in "+error.message);
					return;
				}
				if(results.length)
					workId=idGenerate();
				});
			}
		});
		connection.on('close',function(){
			console.log("Disconnected");
		});
});