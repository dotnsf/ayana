# YASS

Yet Anohter Similarity Search

## Overview

Yet Anohter Similarity Search API.

This API has been developed as yet anohter IBM Watson Visual Recognition Similarity Search API(as beta), which has been retired in 2017/Sep.

This new API tries to handle compatible input data from original one.

## Pre-requisite

- You need Cloudant, NoSQL DBaaS, instance. If you don't have one yet, we recommend you to get one from IBM Bluemix(http://bluemix.net/). You need username and password of Cloudant.

- You also need to install node.js and npm in application server.

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

## How to find similar images

In current code, I use "Color-Histogram" approach to find/judge similarity. See wikipedia for details: https://en.wikipedia.org/wiki/Color_histogram

## Implemented APIs

- GET /v3/collections

    - List all custom collections

- POST /v3/collections

    - Create a new collection

- GET /v3/collections/{collection_id}

    - Retrieve collection details

- POST /v3/collections/{collection_id}/find_similar

    - Find similar images

- DELETE /v3/collections/{collection_id}

    - Delete a collection

- GET /v3/collections/{collection_id}/images

    - List 100 images in a collection

- POST /v3/collections/{collection_id}/images

    - Add images to a collection

- DELETE /v3/collections/{collection_id}/images/{image_id}

    - Delete an image

- GET /v3/collections/{collection_id}/images/{image_id}

    - List image details

- GET /v3/collections/{collection_id}/images/{image_id}/binary (new!)

    - Get image binary with content-type header

- DELETE /v3/collections/{collection_id}/images/{image_id}/metadata

    - Delete image metadata

- GET /v3/collections/{collection_id}/images/{image_id}/metadata

    - List image metadata

- PUT /v3/collections/{collection_id}/images/{image_id}/metadata

    - Add metadata to an image

See Watson API Explorer(https://watson-api-explorer.mybluemix.net/apis/visual-recognition-v3#!/) for details.

## Diffence from original

- No API Key required. You can enable Basic Authentication instead if needed.

- No 'version' parameter required.

- POST /v3/collections/{collection_id}/images have new save_image parameter. If this value would be true, you can save image itself, and retrieve it with following new API.

- GET /v3/collections/{collection_id}/images/{image_id}/binary newly added to get image binary.

- HTTP Response include 'status' which indicate success(true) or fail(false).

## References

- API retirement

    - https://www.ibm.com/blogs/bluemix/2017/08/visual-recognition-api-similarity-search-update

- Original API(Watson API Explorer)

    - https://watson-api-explorer.mybluemix.net/apis/visual-recognition-v3#!/

- Color histogram

    - http://yuzurus.hatenablog.jp/entry/search-image

- Cloudant API reference

    - https://docs.cloudant.com/api.html

- Cloudant API reference(nodejs)

    - https://github.com/cloudant/nodejs-cloudant#api-reference

- Node Canvas

    - https://github.com/Automattic/node-canvas

## Licensing

This code is licensed under MIT.

## Copyright

2017 K.Kimura @ Juge.Me all rights reserved.


