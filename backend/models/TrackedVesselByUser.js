const mongoose = require('mongoose');

const trackedVesselByUserSchema = new mongoose.Schema({
    loginUserId: { type: String, required: true},
    email: String,
    IMO: Number,
    AdminId: String,
    OrgId: String,
    AddedDate: Date,

 
}, { timestamps: true });

const TrackedVesselByUser = mongoose.model('vesselstrackedbyuser', trackedVesselByUserSchema, 'vesselstrackedbyuser');


// Export the model
module.exports =  TrackedVesselByUser ;

