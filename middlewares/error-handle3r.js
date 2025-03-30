const errorHandler = (err, req, res, next)=>{
    //jwt error handler
    if (err.name === "UnauthorizedError") {
        return res.status(401).json({message:"User unauthorized!"})
    }
    //validation error handler
    else{
        if(err.name === "ValidationError"){
            return res.status(403).json({message: err})
        }
        //default to 500 server error
        else{
            return res.status(500).json({message: err})
        }
    }
}

module.exports = errorHandler