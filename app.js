//. app.js

var express = require( 'express' ),
    cfenv = require( 'cfenv' ),
    cloudantlib = require( 'cloudant' ),
    multer = require( 'multer' ),
    basicAuth = require( 'basic-auth-connect' ),
    bodyParser = require( 'body-parser' ),
    Canvas = require( 'canvas' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    http = require( 'http' ),
    app = express();
var settings = require( './settings' );
var cloudant = cloudantlib( { account: settings.cloudant_username, password: settings.cloudant_password } );
var Image = Canvas.Image;
var appEnv = cfenv.getAppEnv();

app.use( multer( { dest: './tmp/' } ).single( 'image_file' ) );
app.use( bodyParser.urlencoded( { extended: true, limit: '10mb' } ) );
app.use( bodyParser.json( { limit: '10mb' } ) );
app.use( express.static( __dirname + '/public' ) );

if( settings.basic_username && settings.basic_password ){
  app.all( '*', basicAuth( function( user, pass ){
    return( user === settings.basic_username && pass === settings.basic_password );
  }));
}

var port = appEnv.port || 3000;

app.get( '/', function( req, res ){
  res.write( 'ok' );
  res.end();
});

var apiRoutes = express.Router();

//. コレクション追加
apiRoutes.post( '/collections', function( req, res ){
  var name = req.body.name;

  if( name ){
    cloudant.db.get( settings.cloudant_db_prefix + name, function( err, body ){
      if( err ){
        if( err.statusCode == 404 ){
          cloudant.db.create( settings.cloudant_db_prefix + name, function( err, body ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              res.write( JSON.stringify( { status: true, message: body }, 2, null ) );
              res.end();
            }
          });
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
          res.end();
        }
      }else{
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: 'name: ' + name + ' already existed.' }, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: name required.' }, 2, null ) );
    res.end();
  }
});

//. コレクション一覧
apiRoutes.get( '/collections', function( req, res ){
  var collections = [];
  cloudant.db.list( function( err, body ){
    if( err ){
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
      res.end();
    }else{
      body.forEach( function( db ){
        if( db.startsWith( settings.cloudant_db_prefix ) ){
          var collection = { collection_id: db, name: db.substring( settings.cloudant_db_prefix.length ) };
//          var db = cloudant.db.use( db );
//          db.info( function( err, body ){
//            if( err ){
                collections.push( collection );
//            }else{
//            }
//          });
        }
      });
      res.write( JSON.stringify( { status: true, collections: collections }, 2, null ) );
      res.end();
    }
  });
});

//. コレクション詳細
apiRoutes.get( '/collections/:collection_id', function( req, res ){
  var collection_id = req.params.collection_id;
  if( collection_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.info( function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        var message = {
          status: true,
          collection_id: collection_id,
          name: collection_id.substring( settings.cloudant_db_prefix.length ),
          //created: body.xxx,
          images: body.doc_count,
          //capacity: (1000000 - body.doc_count),
          status: "available"
        };
        res.write( JSON.stringify( message, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id required.' }, 2, null ) );
    res.end();
  }
});

//. コレクション削除
apiRoutes.delete( '/collections/:collection_id', function( req, res ){
  var collection_id = req.params.collection_id;
  if( collection_id ){
    //. K.Kimura（update には _rev パラメータが必要？）
    cloudant.db.destroy( collection_id, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        res.write( JSON.stringify( { status: true }, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id required.' }, 2, null ) );
    res.end();
  }
});

//. コレクション画像一覧
apiRoutes.get( '/collections/:collection_id/images', function( req, res ){
  var collection_id = req.params.collection_id;
  if( collection_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.list( { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        var images = [];
        body.rows.forEach( function( doc ){
          var image = {
            image_id: doc.id,
            created: doc.doc.datetime,
            image_file: doc.doc.filename,
            metadata: doc.doc.metadata,
            score: 0 //doc.doc.colorhistogram
          };
          images.push( image );
        });
        res.write( JSON.stringify( { status: true, images: images }, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id required.' }, 2, null ) );
    res.end();
  }
});

//. コレクションに画像追加
apiRoutes.post( '/collections/:collection_id/images', function( req, res ){
  var collection_id = req.params.collection_id;
  if( collection_id ){
    var save_image = ( req.params.save_image ? true : false );
    var metadata = {};
    try{
      metadata = ( req.body.metadata ? JSON.parse( req.body.metadata ) : {} );
    }catch( e ){
    }
    var filepath = req.file.path;
    var filetype = req.file.mimetype;
    var originalname = req.file.originalname;
    var fileimage = fs.readFileSync( filepath );
    var fileimage64 = new Buffer( fileimage ).toString( 'base64' );

    //. 現在日付時刻
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1; m = ( ( m < 10 ) ? '0' : '' ) + m;
    var d = now.getDate(); d = ( ( d < 10 ) ? '0' : '' ) + d;
    var h = now.getHours(); h = ( ( h < 10 ) ? '0' : '' ) + h;
    var n = now.getMinutes(); n = ( ( n < 10 ) ? '0' : '' ) + n;
    var s = now.getSeconds(); s = ( ( s < 10 ) ? '0' : '' ) + s;
    var ymdhns = y + "/" + m + "/" + d + " " + h + ":" + n + ":" + s;

    var colorhistogram = getColorHistogram( fileimage );

    var param = {
      filename: originalname,
      filetype: filetype,
      datetime: ymdhns,
      metadata: metadata,
      colorhistogram: colorhistogram
    };

    if( save_image ){
      var attachments = {
        file: {
          content_type: filetype,
          data: fileimage64
        }
      };
      param._attachments = attachment;
    }

    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.insert( param, function( err, body, header ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        var images = [];
        var image = {
          image_id: body.id,
          created: ymdhns,
          image_file: originalname,
          metadata: metadata,
          score: 0
        };
        images.push( image );
        res.write( JSON.stringify( { status: true, images: images, image_processed: 1 }, 2, null ) );
        res.end();
      }

      fs.unlink( filepath, function( err ){} );
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id required.' }, 2, null ) );
    res.end();
  }
});

//. コレクション画像削除
apiRoutes.delete( '/collections/:collection_id/images/:image_id', function( req, res ){
  var collection_id = req.params.collection_id;
  var image_id = req.params.image_id;
  if( collection_id && image_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.destroy( image_id, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        res.write( JSON.stringify( { status: true }, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id and image_id required.' }, 2, null ) );
    res.end();
  }
});

//. コレクション画像情報取得
apiRoutes.get( '/collections/:collection_id/images/:image_id', function( req, res ){
  var collection_id = req.params.collection_id;
  var image_id = req.params.image_id;
  if( collection_id && image_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.get( image_id, { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        res.write( JSON.stringify( { status: true, image_id: image_id, created: body.datetime, image_file: body.filename, metadata: body.metadata, score: 0 }, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id and image_id required.' }, 2, null ) );
    res.end();
  }
});


//. コレクション画像取得(New)
apiRoutes.get( '/collections/:collection_id/images/:image_id/binary', function( req, res ){
  var collection_id = req.params.collection_id;
  var image_id = req.params.image_id;
  if( collection_id && image_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.attachment.get( image_id, "file", function( err, body, head ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        res.contentType( head['content-type'] );
        res.end( body, 'binary' );
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id and image_id required.' }, 2, null ) );
    res.end();
  }
});

//. metadata 削除
apiRoutes.delete( '/collections/:collection_id/images/:image_id/metadata', function( req, res ){
  var collection_id = req.params.collection_id;
  var image_id = req.params.image_id;
  if( collection_id && image_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.get( image_id, { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        body.metadata = {};
        db.insert( body, function( err, body ){
          if( err ){
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
            res.end();
          }else{
            res.write( JSON.stringify( { status: true, metadata: {} }, 2, null ) );
            res.end();
          }
        });
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id and image_id required.' }, 2, null ) );
    res.end();
  }
});

//. metadata 取得
apiRoutes.get( '/collections/:collection_id/images/:image_id/metadata', function( req, res ){
  var collection_id = req.params.collection_id;
  var image_id = req.params.image_id;
  if( collection_id && image_id ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.get( image_id, { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        var metadata = body.metadata;
        res.write( JSON.stringify( { status: true, metadata: metadata }, 2, null ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id and image_id required.' }, 2, null ) );
    res.end();
  }
});

//. metadata 更新
apiRoutes.put( '/collections/:collection_id/images/:image_id/metadata', function( req, res ){
  var collection_id = req.params.collection_id;
  var image_id = req.params.image_id;
  var metadata = {};
  try{
    metadata = ( req.body.metadata ? JSON.parse( req.body.metadata ) : {} );
  }catch( e ){
  }
  if( collection_id && image_id && metadata ){
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.get( image_id, { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        body.metadata = metadata;
        db.insert( body, function( err, body ){
          if( err ){
            res.status( 400 );
            res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
            res.end();
          }else{
            res.write( JSON.stringify( { status: true, metadata: metadata }, 2, null ) );
            res.end();
          }
        });
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id, image_id, and metadata required.' }, 2, null ) );
    res.end();
  }
});

//. コレクション内で類似画像検索
apiRoutes.post( '/collections/:collection_id/find_similar', function( req, res ){
  var collection_id = req.params.collection_id;
  if( collection_id ){
    var filepath = req.file.path;
    var fileimage = fs.readFileSync( filepath );
    var _colorhistogram = getColorHistogram( fileimage );
    var limit = req.body.limit || 10;
    
    var db = cloudant.db.use( settings.cloudant_db_prefix + collection_id );
    db.list( { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        var ranks = [];
        body.rows.forEach( function( doc ){
           var colorhistogram = doc.doc.colorhistogram;

           //. 比較
           var histogramIntersection = 0;
           for( var i = 0; i < 64; i ++ ){
             //. TypeError: Cannot read property '0' of undefined
             histogramIntersection += Math.min( colorhistogram[i], _colorhistogram[i] );
           }

           //. 挿入位置確認
           var idx = -1;
           for( var i = 0; i < ranks.length && idx == -1; i ++ ){
             if( ranks[i].histogramIntersection < histogramIntersection ){
               idx = i;
             }
           }
           if( idx == -1 ){
             idx = ranks.length;
           }

           //. ソートしながら挿入
           var similar_image = {
             image_id: doc.id,
             created: doc.doc.datetime,
             image_file: doc.doc.filename,
             metadata: doc.doc.metadata,
             score: histogramIntersection
           };
           var howMany = 0;
           if( ranks.length >= limit ){ howMany = ranks.length - limit + 1; }
           ranks.splice( idx, howMany, similar_image );
        });
        res.write( JSON.stringify( { status: true, similar_images: ranks }, 2, null ) );
        res.end();
      }

      fs.unlink( filepath, function( err ){} );
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'parameter: collection_id required.' }, 2, null ) );
    res.end();
  }
});

app.use( settings.api_base_path, apiRoutes );

app.listen( port );
console.log( "server starting on " + port + " ..." );


//. カラーヒストグラム作成
//. http://yuzurus.hatenablog.jp/entry/search-image
function getColorHistogram( fileimage ){
  //. 画像データを Canvas の Context に設定
  var img = new Image;
  img.src = fileimage;
  var canvas = new Canvas( img.width, img.height );
  var ctx = canvas.getContext( '2d' );
  ctx.drawImage( img, 0, 0, img.width, img.height );

  //. RGB 値を取得
  var imagedata = ctx.getImageData( 0, 0, img.width, img.height );

  //. 減色してヒストグラム化
  colorhistogram = [];
  for( var i = 0; i < 64; i ++ ){
    colorhistogram[i] = 0;
  }
  for( var y = 0; y < imagedata.height; y ++ ){
    for( var x = 0; x < imagedata.width; x ++ ){
      var idx = ( y * imagedata.width + x ) * 4;
      var r = Math.floor( imagedata.data[idx] / 64 );
      var g = Math.floor( imagedata.data[idx+1] / 64 );
      var b = Math.floor( imagedata.data[idx+2] / 64 );
      //var a = Math.floor( imagedata.data[idx+3] / 64 );
      var index = 16 * r + 4 * g + b;
      colorhistogram[index] ++;
    }
  }

  //. 8bit に正規化
  var pixels = imagedata.height * imagedata.width;
  for( var i = 0; i < 64; i ++ ){
    colorhistogram[i] = Math.floor( 256 * colorhistogram[i] / pixels );
  }

  return colorhistogram;
}
