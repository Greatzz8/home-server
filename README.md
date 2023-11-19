# Home Server

This project can be used as home server or personal cloud drive. My original idea is to streaming videos to my phone or smart TV but it can also store other files.

The front end is written in React and is designed with Bootstrap. The backend is built with node.js.

This project uses and adapts codes from [huge-uploader](https://github.com/Buzut/huge-uploader/tree/master) and [huge-uploader-nodejs](https://github.com/Buzut/huge-uploader-nodejs/tree/master). Thank the authors for their great work!

## Setup

After cloning this repo, install all necessary dependencies by npm:

```bash
npm install
```

Then make a .env file to contain the token secret used by JWT. The secret is a random string, you can generate it with

```javascript
require("crypto").randomBytes(64).toString("hex");
```

Copy and paste it into the .env file. The env file should look like this:

```bash
TOKEN_SECRET=6d96ef165435afce423bd828c300daae82feeb60d525d90882df34b296ef71b667af907246eba3beff663e0eb483bbe1f46282c5efcbf3a1a6adc67a1d5c45dc
```

You should keep this env file safely in your server.

Then create two folders:

```bash
cd static
mkdir Movies
mkdir temp
```

Then move the "build" folder from [frontend project](https://github.com/Greatzz8/Home-server-react) into "static" folder.

Last step, substitute the "127.0.0.1" with your own ip address or domain name:

```bash
sed -i 's/127.0.0.1:8081/your domain here/g' static/login.html static/build/static/js/*.js
```

If you plan to enable HTTPS (this is strongly recommeded if you want to host this project on a public accessable web server instead of host it under your home LAN) then you should also change the "http" to "https" in those files.

Run

```bash
node server.js
```

To start the server.

## Manage Allowed Users

After the setup you need to add some allowed users so they can login. **Please note that all users can see all files. They share the server**.

The allowed users are stored in a json file. Run

```bash
node admin.js
```

To add/change password/delete users.

## Things You May Want to Change

In server.js line 20 there is:

```javascript
const max_file_size = 5000;
```

This is the maxium size constrain on one file uploaded to the server. Feel free to change it.
