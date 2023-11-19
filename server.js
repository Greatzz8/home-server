var express = require('express');
var app = express();
const path=require('path');
var fs=require('fs');
var cors=require('cors');
const cookieParser=require("cookie-parser");
const util=require('util');
const uploader=require('huge-uploader-nodejs');
const jwt=require("jsonwebtoken");
const env=require('dotenv');
const bcrypt=require('bcrypt');
const readdir=util.promisify(fs.readdir);
const stat=util.promisify(fs.stat);
env.config();
app.use(cors());  // If enable CORS in nginx then comment this line.
app.use(cookieParser())
const movie_dir=path.join(__dirname,'static/Movies');

const temp_dir=path.join(__dirname,'static/temp');
const max_file_size=5000;
const max_chunk_size=10;

//app.use('/Movies',express.static('static/Movies'));


app.get('/login',function (req, res) {
    res.sendFile(__dirname+'/static/login.html');
})
app.post('/login',express.urlencoded(false),(req,res)=>{
    const username=req.body.username;
    console.log("Start login");
    let user=get_user(username);
    if(user.length!==1){
        return res.status(403).json("Invalid Login: Wrong Username or Password");
    }
    bcrypt.compare(req.body.password,user[0].hash,(err,data)=>{
        if(err){
            console.error(err);
            return;
        }
        if(data === false){
            return res.status(403).json("Invalid Login: Wrong Username or Password");
        }
        user={"username":user[0].username};
        let token=jwt.sign(user,process.env.TOKEN_SECRET,{expiresIn: "6h"})
        res.cookie("token",token,{httpOnly:false,maxAge:30*24*3600});
        return res.redirect('/')
    })

})
app.post('/logout',function (req, res) {
    console.log("Logging out")
    res.clearCookie('token');
    res.end();
})



app.use(auth_jwt);
app.use(express.static(path.join(__dirname,'static'),{index:false}));
app.get('/movies',function (req, res) {
    let dir_path=req.query.path;
    let show_path="";
    if(!dir_path || dir_path==="")
    {
        show_path=movie_dir;
    }else{
        show_path=movie_dir+"/"+dir_path
    }
    console.log("requesting movie list for "+show_path+"...");
    fs.readdir(show_path,function (err, files) {
        if(err){
            console.log("Can not read the movie list.");
            res.end(JSON.stringify({'result':'nothing'}));
        }
        else
        {
            let file_info=[];
            for (let file of files) {
                let filepath=path.join(show_path,file);
                let f_stat=fs.statSync(filepath);
                file_info.push({'name':file,'is_dir':f_stat.isDirectory(),'size':bytes2str(f_stat.size)});
            }
            res.end(JSON.stringify({'result':file_info}));
        }
    })
})

app.get('/disk',function (req, res){
    res.end(JSON.stringify({'result':bytes2str(calc_sync(movie_dir))}));
})

app.get('/checkAssemble',function (req,res) {
   let id=req.query.id;
   fs.readdir(__dirname+'/static/temp',function (err, files) {
       for (const file of files) {
           if(file.includes(id)){
               return res.json({'result':false});
           }
       }
       res.json({'result':true});
   })
});


app.get('/',function (req, res) {
    res.sendFile(__dirname+'/static/build/index.html');
})
app.delete('/',function (req, res){
    let dir_path=req.query.path;
    let show_path="";
    if(!dir_path || dir_path==="")
    {
        show_path=movie_dir;
    }else{
        show_path=movie_dir+"/"+dir_path
    }
    let filename=req.query.filename;
    fs.rm(path.join(show_path,filename),{recursive:true},function () {
        res.end(JSON.stringify({"result":"done"}));
    });
});

app.get('/mkdir',function (req, res) {
    let dir_path=req.query.path;
    let show_path="";
    if(!dir_path || dir_path==="")
    {
        show_path=movie_dir;
    }else{
        show_path=movie_dir+"/"+dir_path
    }
    let folder=req.query.folder;
    fs.mkdir(path.join(show_path,folder),(err)=>{
        if(err){
            console.error(err);
            res.end(JSON.stringify({'result':'failed'}));
            return;
        }
        res.end(JSON.stringify({'result':'done'}));
    })
})
app.get("/getdir",async function(req, res){
    let dir_path=req.query.path;
    let show_path="";
    if(!dir_path || dir_path==="")
    {
        show_path=movie_dir;
    }else{
        show_path=movie_dir+"/"+dir_path
    }
    let dirs=await get_dirs(show_path);
    res.end(JSON.stringify({'result':dirs}));
})

app.get("/moveinto",function (req, res) {
    let dir_path=req.query.path;
    let show_path="";
    if(!dir_path || dir_path==="")
    {
        show_path=movie_dir;
    }else{
        show_path=movie_dir+"/"+dir_path
    }
    const original_path=show_path+"/"+req.query.filename;
    const target_path=show_path+"/"+req.query.target+"/"+req.query.filename;
    fs.rename(original_path,target_path,()=>{
        res.end(JSON.stringify({'result':'done'}));
    })
})




function get_user(username){
    let raw_data=fs.readFileSync("allowed_user.json");
    let users=JSON.parse(raw_data);
    return users.filter(item => item.username===username)
}

app.post('/upload',function (req, res) {
    uploader(req, temp_dir, max_file_size, max_chunk_size)
        .then((assembleChunks) => {
            // chunk written to disk
            res.writeHead(204, 'No Content');
            res.end();

            // on last chunk, assembleChunks function is returned
            // the response is already sent to the browser because it can take some time if the file is huge
            if (assembleChunks) {
                // so you call the promise, it assembles all the pieces together and cleans the temporary files
                assembleChunks()
                    // when it's done, it returns an object with the path to the file and additional post parameters if any
                    .then(data => {
                        let new_path;
                        if(!data.postParams.move_to || data.postParams.move_to.length===0)
                        {
                            new_path=movie_dir+"/"+data.postParams.filename;
                        }else{
                            new_path=movie_dir+"/"+data.postParams.move_to+"/"+data.postParams.filename
                        }
                        fs.rename(data.filePath,new_path,()=>{
                            //res.end(JSON.stringify({'result':'done'}));
                        })
                    }) // { filePath: 'tmp/1528932277257', postParams: { email: 'upload@corp.com', name: 'Mr Smith' } }
                    // errors if any are triggered by the file system (disk is full…)
                    .catch(err => console.log(err));
            }
        }).catch((err) => {
        if (err.message === 'Missing header(s)') {
            res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
            res.end('Missing uploader-* header');
            return;
        }

        if (err.message === 'Missing Content-Type') {
            res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
            res.end('Missing Content-Type');
            return;
        }

        if (err.message.includes('Unsupported content type')) {
            res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
            res.end('Unsupported content type');
            return;
        }

        if (err.message === 'Chunk is out of range') {
            res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
            res.end('Chunk number must be between 0 and total chunks - 1 (0 indexed)');
            return;
        }
        if (err.message === 'File is above size limit') {
            res.writeHead(413, 'Payload Too Large', { 'Content-Type': 'text/plain' });
            res.end(`File is too large. Max fileSize is: ${maxFileSize}MB`);
            return;
        }

        if (err.message === 'Chunk is above size limit') {
            res.writeHead(413, 'Payload Too Large', { 'Content-Type': 'text/plain' });
            res.end(`Chunk is too large. Max chunkSize is: ${maxChunkSize}MB`);
            return;
        }

        // this error is triggered if a chunk with uploader-chunk-number header != 0
        // is sent and there is no corresponding temp dir.
        // It means that the upload dir has been deleted in the meantime.
        // Although uploads should be resumable, you can't keep partial uploads for days on your server
        if (err && err.message === 'Upload has expired') {
            res.writeHead(410, 'Gone', { 'Content-Type': 'text/plain' });
            res.end(err.message);
            return;
        }

        // other FS errors
        res.writeHead(500, 'Internal Server Error'); // potentially saturated disk
        res.end();
    });
})

app.post('/copy',express.json(),function (req, res) {
    console.log(req.body)
    const cliPath=req.body.cliPath;
    const original=cliPath===""?movie_dir+"/"+req.body.clipboard:movie_dir+"/"+cliPath+"/"+req.body.clipboard;
    const target=req.body.cPath===''?movie_dir+"/"+req.body.clipboard:movie_dir+"/"+req.body.cPath+"/"+req.body.clipboard;
    fs.cp(original,target,(err)=>{
        if(err){
            console.error(err);
            res.end(JSON.stringify({'result':'error'}));
            return;
        }
        res.end(JSON.stringify({"result":"done"}));
    })
})

app.post('/rename',express.json(),function (req,res) {
    const path=req.body.path===""?movie_dir:movie_dir+'/'+req.body.path;
    const oldName=req.body.old;
    const newName=req.body.new;
    fs.rename(path+'/'+oldName,path+'/'+newName,(err)=>{
        if(err){
            console.error(err);
            res.end(JSON.stringify({'result':'error'}));
            return;
        }
        res.end(JSON.stringify({"result":"done"}));
    })
})


var server = app.listen(8081,"127.0.0.1");

function bytes2str(fsize) {
    if(fsize<1024)
    {
        return `${fsize}B`;
    } else if (1024*1024>fsize){
        return `${(fsize/1024).toFixed(1)}KB`;
    }else if(fsize<1024*1024*1024){
        return `${(fsize/1024/1024).toFixed(1)}MB`;
    }else{
        return `${(fsize/1024/1024/1024).toFixed(1)}GB`;
    }
}


function calc_sync(dir){
    let files=fs.readdirSync(dir);
    let total_size=0;
    for (let file of files) {
        let filepath=path.join(dir,file);
        let f_stat=fs.statSync(filepath);
        if(f_stat.isDirectory())
        {
            total_size+=calc_sync(filepath);
        }else{
            total_size+=f_stat.size;
        }
    }
    return total_size;
}

function auth_jwt(req,res,next){
    //next()
    let token;
    if(req.cookies.token){
        token=req.cookies.token;
    }else if(req.headers.authorization){
        token=req.headers.authorization.substring(7);
    }

    try{
        let user=jwt.verify(token,process.env.TOKEN_SECRET);
        req.user=user;
        next()
    }catch (e) {
        console.error(e);
        console.log(req.originalUrl)
        res.clearCookie("token");
        res.redirect('/login');
    }

}



