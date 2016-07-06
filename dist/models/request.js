'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _thinky = require('../lib/thinky.js');

var _thinky2 = _interopRequireDefault(_thinky);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var type = _thinky2.default.type;

var unassignedTAG = 'unknown';

var Request = _thinky2.default.createModel('Request', {
    id: type.string(),
    uuid: type.string(),
    createdBy: type.string().required().default(unassignedTAG),
    yanCode: type.string().required().default(unassignedTAG),
    assignedTo: type.string().default(unassignedTAG),
    complete: type.boolean().default(false),
    notes: type.array().default([]).schema(type.string()),
    // notes: [type.string()]

    //Biological Materia
    species: type.string().required(),
    secondSpecies: type.string().required(),
    // searchDatabase: type.string().required(),
    tissue: type.string().required(),
    tissueAgeNum: type.string().required(),
    tissueAgeType: type.string().required(),
    growthConditions: type.string().required(),

    //Project Summary
    projectDescription: type.string().required(),
    hopedAnalysis: type.string().required(),
    bufferComposition: type.string().required(),

    // Primary Analysis
    analysisType: type.string().required(),
    secondaryAnalysisType: type.string().required(),
    typeOfPTM: type.string().required(),
    quantitativeAnalysisRequired: type.string().required(),
    typeOfLabeling: type.string().required(),
    labelUsed: type.string().required(),

    // Sample Preparation
    samplePrep: type.string().required(),
    digestion: type.string().required(),
    enzyme: type.string().required(),

    // New Construct for Database
    accession: type.string().required(),
    sequenceInfo: type.string().required(),
    dbEntry: type.string().required()

    // Sample Description
    // typeOfDigestion: type.string().required(),
    // preferredOrder: type.string().required(),
    // sampleNumber: type.string().required(),
    // sampleDescription: type.string().required(),

});

exports.default = Request;
// import SampleDescription from './sampleDescription';
// Request.hasMany(SampleDescription, 'samplesDescriptions', 'id', 'requestID');
// import SampleImage from './sampleImage';
// Request.hasMany(SampleImage, 'samplesImages', 'id', 'requestID');