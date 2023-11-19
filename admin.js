const fs=require('fs');
const readline=require('readline/promises');
const process=require('process');
const bcrypt=require('bcrypt');
console.log("Welcome to the home server admin tool!")
console.log("Here you can add/change/delete users and passwords.")
let input=1;
const rl = readline.createInterface({input:process.stdin,output:process.stdout});
op()

async function op(){
    while (input!=0){
        console.log("Choose the operation:")
        input=await rl.question("0-Quit  1-Add user  2-Change password  3-Delete user\n")
        if(input=="1"){
            let username=await rl.question("Please input the username:\n");
            let password=await rl.question("Please input the password:\n");
            await add_user(username,password);
        }
        if(input=="2"){
            let username=await rl.question("Please input the username:\n");
            let password=await rl.question("Please input the password:\n");
            await change_pwd(username,password);
        }
        if(input=="3"){
            let username=await rl.question("Please input the username:\n");
            await delete_user(username);
        }
    }
    process.exit(0)
}

async function add_user(user,password){
    let users;
    try{
        let raw_data=fs.readFileSync("allowed_user.json");
        users=JSON.parse(raw_data);
    }catch (e){
        users=[]
    }
    let check=users.filter((u)=>u.username==user);
    if(check.length!=0){
        console.log("User already existed!")
        return;
    }
    const hash=await bcrypt.hash(password,10);
    users.push({username:user,hash:hash});
    fs.writeFileSync('allowed_user.json',JSON.stringify(users));
    console.log("Add successfully");
}
async function change_pwd(user,password){
    let users;
    try{
        let raw_data=fs.readFileSync("allowed_user.json");
        users=JSON.parse(raw_data);
    }catch (e){
        users=[];
    }
    let check=users.filter((u)=>u.username==user);
    if(check.length==0){
        console.log("User not found!")
        return;
    }
    const hash=await bcrypt.hash(password,10);
    check[0].hash=hash;
    fs.writeFileSync('allowed_user.json',JSON.stringify(users));
    console.log("Change successfully");
}
async function delete_user(user){
    let users;
    try{
        let raw_data=fs.readFileSync("allowed_user.json");
        users=JSON.parse(raw_data);
    }catch (e){
        users=[];
    }
    let check=users.filter((u)=>u.username==user);
    if(check.length==0){
        console.log("User not found!")
        return;
    }
    users.splice(users.indexOf(check[0]),1);
    fs.writeFileSync('allowed_user.json',JSON.stringify(users));
    console.log("Delete successfully");
}







