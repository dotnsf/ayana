# YASS

Yet Anohter Similarity Search

## Overview

Yet Anohter Similarity Search API.

This API has been developed as yet anohter IBM Watson Visual Recognition Similarity Search API, which has been retired in 2017/Sep.

This new API tries to handle compatible input data from original one.

## Pre-requisite

- You need Cloudant, NoSQL DBaaS, instance. If you don't have one yet, we recommend you to get one from IBM Bluemix(http://bluemix.net/). You need username and password of Cloudant.

- You also need to install node.js and npm.

- This service use node-canvas library. So you need to install dependencies for node-canvas. Follow this page for instructions: 

    - https://github.com/Automattic/node-canvas

## Install

- Git clone/download source code from GitHub.

- Edit settings.js with your Cloudant username and password.

- (Optional)Edit settings.js with Basic Authentication username and password ifyou want to use Basic Authentication.

- Install libraries

    - $ npm install

- Run app.js with Node.js

    - $ node app

- You can access /v3/xxxxxxx APIs .

## Licensing

This code is licensed under MIT.

## Copyright

2017 K.Kimura @ Juge.Me all rights reserved.


