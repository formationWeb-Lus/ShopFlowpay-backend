import multer from "multer";
import path from "path";


const storage = multer.diskStorage({

  destination: (
    req,
    file,
    cb
  ) => {

    cb(
      null,
      "uploads/products"
    );

  },


  filename: (
    req,
    file,
    cb
  ) => {

    const uniqueName =
      Date.now()
      + "-"
      + Math.round(
          Math.random() * 100000
        )
      + path.extname(
          file.originalname
        );


    cb(
      null,
      uniqueName
    );

  }

});


const upload = multer({

  storage,

  limits:{
    fileSize:
      5 * 1024 * 1024
  },


  fileFilter(
    req,
    file,
    cb
  ){

    const allowed =
      [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];


    if(
      allowed.includes(
        file.mimetype
      )
    ){

      cb(null,true);

    }else{

      cb(
        new Error(
          "Format image non supporté"
        )
      );

    }

  }

});


export default upload;