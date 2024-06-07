import "promise-polyfill/src/polyfill";
import React, { useState, useEffect } from "react";
import dragula from "dragula";
import "dragula/dist/dragula.css";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
// import { listen } from "delivery/lib/delivery.server"; // Use delivery.client for client-side code
import $ from "jquery"; // Import jQuery properly
import "popper.js"; // Import Popper.js properly
import "bootstrap/js/dist/tooltip"; // Correct Bootstrap tooltip import
import AsyncSelect from "react-select/async";
import axios from "axios";
import config from "./../../../config";
import Construct from "./Construct";
import Sample from "./Sample";
import OptionWithChildAsValue from "./OptionWithChildAsValue";
import ImageUploadForm from "./ImageUploadForm";
// import Util from "lib/util";

const api_key = config.NCBIAPIKey || null;

const supportedFileTypes = global.supportedFileTypes;

const s4 = () =>
  Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
const guid = () =>
  s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();

$(function () {
  initDrag();
  initToolTips();
});

function initDrag() {
  const drake = dragula({
    isContainer: function (el) {
      return el.classList.contains("dragg");
    },
  });
}

function initToolTips() {
  $('[data-toggle="tooltip"]').tooltip();
}

// Helper function to convert base64 to Blob
const base64ToBlob = (base64, contentType) => {
  const byteCharacters = atob(base64.split(",")[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const MyForm = () => {
  const initialState = window.existingRequest
    ? {
        samples: window.existingRequest.samples || [],
        supportingImages: window.existingRequest.supportingImages || [],
        constructs: window.existingRequest.constructs || [],
        species: window.existingRequest.species
          ? {
              label: window.existingRequest.species,
              value: window.existingRequest.species,
            }
          : null,
        secondSpecies: window.existingRequest.secondSpecies
          ? {
              label: window.existingRequest.secondSpecies,
              value: window.existingRequest.secondSpecies,
            }
          : null,
        initialValues: {
          species: window.existingRequest.species
            ? {
                label: window.existingRequest.species,
                value: window.existingRequest.species,
              }
            : null,
          secondSpecies: window.existingRequest.secondSpecies
            ? {
                label: window.existingRequest.secondSpecies,
                value: window.existingRequest.secondSpecies,
              }
            : null,
        },
        shouldUseInitial: {
          species: window.existingRequest.species ? true : false,
          secondSpecies: window.existingRequest.secondSpecies ? true : false,
        },
      }
    : {
        samples: [],
        supportingImages: [],
        constructs: [],
        species: null,
        secondSpecies: null,
        initialValues: {
          species: null,
          secondSpecies: null,
        },
        shouldUseInitial: {
          species: false,
          secondSpecies: false,
        },
      };

  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    $("#page-loader").fadeOut("slow", function () {
      $(this).remove();
    });
  }, []);

  const addConstruct = () => {
    const key = guid();
    setState((prevState) => ({
      ...prevState,
      constructs: prevState.constructs.concat([{ key }]),
    }));
  };

  const removeConstruct = (construct) => {
    setState((prevState) => ({
      ...prevState,
      constructs: prevState.constructs.filter(
        (c) => c.key !== construct.key || c.id !== construct.id
      ),
    }));
  };

  const addSample = () => {
    const key = guid();
    setState((prevState) => ({
      ...prevState,
      samples: prevState.samples.concat([{ key }]),
    }));
  };

  const removeSample = (sample) => {
    setState((prevState) => ({
      ...prevState,
      samples: prevState.samples.filter(
        (s) => s.key !== sample.key || s.id !== sample.id
      ),
    }));
  };

  const handleImagesChange = (images) => {
    setState((prevState) => ({
      ...prevState,
      supportingImages: images,
    }));
  };

  const getListOfSpecies = async (input, stateKeyName, callback) => {
    const useInitial = !!(
      !input &&
      state[stateKeyName] &&
      state.shouldUseInitial[stateKeyName]
    );

    console.log("useInitial", useInitial);

    if (useInitial) {
      const useInitialValue = state.initialValues[stateKeyName];
      callback([
        { label: useInitialValue.label, value: useInitialValue.value },
      ]);
      return;
    }

    setState((prevState) => ({
      ...prevState,
      shouldUseInitial: {
        ...prevState.shouldUseInitial,
        [stateKeyName]: false,
      },
    }));

    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmode=json&db=taxonomy&term=${encodeURIComponent(
      input
    )}&api_key=${api_key}`;

    try {
      const response = await axios.get(url, {
        proxy: {
          host: "swproxy.nbi.ac.uk",
          port: 8080,
        },
        timeout: 5000,
      });

      const foundOptions =
        response &&
        response.data &&
        response.data.esearchresult &&
        response.data.esearchresult.idlist &&
        response.data.esearchresult.idlist.length > 0;

      if (!foundOptions) {
        return callback([]);
      }

      const options = response.data.esearchresult.idlist.map((id) => {
        return {
          label: input, // Adjust this as needed to display the correct label
          value: id, // Use id or any other unique identifier
        };
      });

      return callback(options);
    } catch (error) {
      console.error("Error fetching Species");
      return callback([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    setState((prevState) => ({ ...prevState, isSubmitting: true }));
    setState({ ...state, isSubmitting: true });

    const form = e.target;
    const formData = new FormData(form);

    // change value of species field
    formData.set("species", state.species ? state.species.label : "");
    formData.set(
      "secondSpecies",
      state.secondSpecies ? state.secondSpecies.label : ""
    );

    let hasFiles = false;

    state.supportingImages.forEach((supportingImage, index) => {
      if (supportingImage.file.name) {
        hasFiles = true;
        formData.append(`image[${index}]`, supportingImage.file);

        // Convert base64 preview to Blob and append to FormData
        const previewBlob = base64ToBlob(supportingImage.preview, "image/jpeg");
        const originalName = supportingImage.file.name;
        formData.append(`preview[${index}]`, previewBlob, originalName);

        formData.append(
          `imageDescriptions[${index}]`,
          supportingImage.description || ""
        );
        formData.append(`imageNames[${index}]`, supportingImage.file.name);
      }
    });

    state.samples.forEach((sample) => {
      if (sample.number) {
        formData.append(`sampleNumbers[]`, sample.number || "");
        formData.append(`sampleDescriptions[]`, sample.description || "");
        formData.append(`sampleLabels[]`, sample.label || "");
      }
    });

    state.constructs.forEach((construct) => {
      if (construct.accession) {
        formData.append(`accessions[]`, construct.accession || "");
        formData.append(`sequenceInfos[]`, construct.sequenceInfo || "");
        formData.append(`dbEntries[]`, construct.dbEntry || "");
      }
    });

    // Add non-form stuff to formData
    if (window && window.existingRequest && window.existingRequest.janCode) {
      formData.append("janCode", window.existingRequest.janCode);
    }
    if (
      window &&
      window.existingRequest &&
      window.existingRequest.id &&
      !window.existingRequest.isClone
    ) {
      formData.append("requestID", window.existingRequest.id);
    }

    let theResponseRequestID = null;

    try {
      const response = await axios.post("/new", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status !== 200) {
        console.error("Error uploading form:", response);
        Toastify({
          text: "Error uploading form",
          duration: 4500,
          gravity: "top",
          position: "right",
          backgroundColor: "red",
          // onHidden: () =>
          //   setState((prevState) => ({ ...prevState, isSubmitting: false })),
        }).showToast();
        return;
      } else {
        theResponseRequestID = response.data.requestID;

        console.log("gary", response.data.requestID, theResponseRequestID);

        Toastify({
          text: `Form ${response.data.janCode} ${
            response.data.editingForm ? "edited" : "created"
          } successfully. Now redirecting...`,
          duration: 4500,
          gravity: "top",
          position: "right",
          style: { background: "green" },
          // onHidden: () => {
          //   window.location.href = `http://localhost:3000/request/${response.data.requestID}`;
          // },
        }).showToast();
      }
    } catch (error) {
      console.error("Error uploading form:", error);
      Toastify({
        text: "Error submitting request. It may or may not be fully formed. Contact system admin with a timestamp to resolve the issue.",
        duration: 4500,
        gravity: "top",
        position: "right",
        backgroundColor: "red",
        // onHidden: () =>
        //   setState((prevState) => ({ ...prevState, isSubmitting: false })),
      }).showToast();
    } finally {
      console.log("finally entered", theResponseRequestID);

      setTimeout(() => {
        console.log("setteim entere", theResponseRequestID);

        if (!!theResponseRequestID) {
          window.location.href = `${config.baseURL}/request/${theResponseRequestID}`;
        } else {
          setIsSubmitting(false);
          setState((prevState) => ({ ...prevState, isSubmitting: false }));
          setState({ ...state, isSubmitting: false });
        }
      }, 4500);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} id="new-form" encType="multipart/form-data">
        <div className="container">
          <label>
            <input
              type="checkbox"
              id="required-readme"
              defaultChecked={
                window && window.existingRequest && window.existingRequest.id
              }
              required
              //required COMMENT OUT FOR TESTING
            />{" "}
            <span>I have completed the above</span>
          </label>

          {window &&
            window.existingRequest &&
            window.existingRequest.id &&
            !window.existingRequest.isClone && (
              <input
                type="hidden"
                name="requestID"
                id="requestID"
                defaultValue={window.existingRequest.id}
              />
            )}

          {window &&
            window.existingRequest &&
            window.existingRequest.janCode &&
            !window.existingRequest.isClone && (
              <div className="form-group">
                <label>Label</label>
                <input
                  type="text"
                  className="form-control"
                  name="janCode"
                  id="janCode"
                  defaultValue={window.existingRequest.janCode}
                />
              </div>
            )}

          <div className="row">
            <div className="col-md-12">
              <div className="group">
                <div className="container">
                  <span className="badge" />
                  <fieldset>
                    <img src="/img/Eyedropper-Tool.png" className="center" />

                    <h3 className="group-label">Biological Material</h3>

                    <div className="form-group">
                      <label>
                        Species{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"
                        />
                      </label>
                      <AsyncSelect
                        id="species"
                        required
                        onBlurResetsInput={false}
                        onSelectResetsInput={false}
                        loadOptions={(input, callback) =>
                          getListOfSpecies(input, "species", callback)
                        }
                        name="species"
                        isClearable
                        value={state.species}
                        onChange={(value) =>
                          setState({ ...state, species: value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        Second Species{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the second species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"
                        />
                      </label>
                      <AsyncSelect
                        id="secondSpecies"
                        required
                        onBlurResetsInput={false}
                        onSelectResetsInput={false}
                        loadOptions={(input, callback) =>
                          getListOfSpecies(input, "secondSpecies", callback)
                        }
                        name="secondSpecies"
                        isClearable
                        value={state.secondSpecies}
                        onChange={(value) =>
                          setState({ ...state, secondSpecies: value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Tissue</label>
                      <select
                        className="form-control"
                        id="tissue"
                        name="tissue"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.tissue
                        }
                      >
                        <OptionWithChildAsValue>
                          seedlings
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>leaves</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Ecoli culture (recombinant protein)
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>rosette</OptionWithChildAsValue>
                        <OptionWithChildAsValue>roots</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          cell culture
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>callus</OptionWithChildAsValue>
                        <OptionWithChildAsValue>flower</OptionWithChildAsValue>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tissue age</label>

                      <div className="row">
                        <div className="col-md-12">
                          <input
                            className="form-control"
                            type="number"
                            id="tissueAgeNum"
                            name="tissueAgeNum"
                            min="0"
                            defaultValue={
                              window &&
                              window.existingRequest &&
                              window.existingRequest.tissueAgeNum
                            }
                            required
                            //required COMMENT OUT FOR TESTING
                          />
                        </div>
                        <div className="col-md-12">
                          <select
                            className="form-control"
                            id="tissueAgeType"
                            name="tissueAgeType"
                            defaultValue={
                              window &&
                              window.existingRequest &&
                              window.existingRequest.tissueAgeType
                            }
                            required
                          >
                            <OptionWithChildAsValue>
                              hour(s)
                            </OptionWithChildAsValue>
                            <OptionWithChildAsValue>
                              day(s)
                            </OptionWithChildAsValue>
                            <OptionWithChildAsValue>
                              week(s)
                            </OptionWithChildAsValue>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Growth conditions</label>
                      <select
                        className="form-control"
                        id="growthConditions"
                        name="growthConditions"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.growthConditions
                        }
                      >
                        <OptionWithChildAsValue>plate</OptionWithChildAsValue>
                        <OptionWithChildAsValue>culture</OptionWithChildAsValue>
                        <OptionWithChildAsValue>liquid</OptionWithChildAsValue>
                        <OptionWithChildAsValue>6well</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          soil grown
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          hydrophonics
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="group">
                <div className="container">
                  <span className="badge" />
                  <fieldset>
                    <img src="/img/Properties.png" className="center" />

                    <h3 className="group-label">Primary Analysis</h3>

                    <div className="form-group">
                      <label>
                        Type of analysis{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="If you know the type of analysis you want, select it here"
                        />
                      </label>
                      <select
                        className="form-control"
                        id="analysisType"
                        name="analysisType"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.analysisType
                        }
                      >
                        <OptionWithChildAsValue>
                          Discovery
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>SRM</OptionWithChildAsValue>
                        <OptionWithChildAsValue>PRM</OptionWithChildAsValue>
                        <OptionWithChildAsValue>DIA</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Acurate Mass
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        Secondary analysis{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select only if you want multiple types of analysis done on the same sample, e.g. discovery and targeted"
                        />
                      </label>
                      <select
                        className="form-control"
                        id="secondaryAnalysisType"
                        name="secondaryAnalysisType"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.secondaryAnalysisType
                        }
                      >
                        <OptionWithChildAsValue>None</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Discovery
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>SRM</OptionWithChildAsValue>
                        <OptionWithChildAsValue>PRM</OptionWithChildAsValue>
                        <OptionWithChildAsValue>DIA</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Acurate Mass
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        Type of PTM{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the type of PTM you are interested in"
                        />
                      </label>
                      <select
                        className="form-control"
                        id="typeOfPTM"
                        name="typeOfPTM"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.typeOfPTM
                        }
                      >
                        <OptionWithChildAsValue>None</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Biotinylation
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Phosphorylation
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Acetylation
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Ubiquitination
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Glycosylation
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Poly ADP Ribosylation
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        Quantitative analysis required{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the type of quantitative analysis if you have discussed with the Proteomics team. Otherwise leave this in the default option "
                        />
                      </label>
                      <select
                        className="form-control"
                        id="quantitativeAnalysisRequired"
                        name="quantitativeAnalysisRequired"
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.quantitativeAnalysisRequired
                        }
                        required
                      >
                        <OptionWithChildAsValue>None</OptionWithChildAsValue>
                        <OptionWithChildAsValue>Semi</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Relative
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Absolute
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        Type of labeling{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the type of labeling if you have discussed with the proteomics team. Otherwise leave this in the default option "
                        />
                      </label>
                      <select
                        className="form-control"
                        id="typeOfLabeling"
                        name="typeOfLabeling"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.typeOfLabeling
                        }
                      >
                        <OptionWithChildAsValue>None</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Label-free
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Post-extraction
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Metabolic
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        Label used{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the type of label if you have discussed with the proteomics team. Otherwise leave this in the default option"
                        />
                      </label>
                      <select
                        className="form-control"
                        id="labelUsed"
                        name="labelUsed"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.labelUsed
                        }
                      >
                        <OptionWithChildAsValue>None</OptionWithChildAsValue>
                        <OptionWithChildAsValue>TMT0</OptionWithChildAsValue>
                        <OptionWithChildAsValue>TMT6</OptionWithChildAsValue>
                        <OptionWithChildAsValue>TMT10</OptionWithChildAsValue>
                        <OptionWithChildAsValue>iTRAQ</OptionWithChildAsValue>
                        <OptionWithChildAsValue>15N</OptionWithChildAsValue>
                      </select>
                    </div>
                  </fieldset>
                </div>
              </div>
              <div className="group">
                <div className="container">
                  <span className="badge" />
                  <fieldset>
                    <img src="/img/Wash-Cold.png" className="center" />

                    <h3 className="group-label">Sample Preparation</h3>

                    <div className="form-group">
                      <label>
                        Sample preparation{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the type of sample preparation used. If not available let the proteomics team know so it can be added "
                        />
                      </label>
                      <select
                        className="form-control"
                        id="samplePrep"
                        name="samplePrep"
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.samplePrep
                        }
                        required
                      >
                        <OptionWithChildAsValue>
                          crude extract
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          microsomal
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          plasma membrane
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>IP</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          HPLC purified
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          FPLC purified
                        </OptionWithChildAsValue>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Digestion</label>
                      <select
                        className="form-control"
                        id="digestion"
                        name="digestion"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.digestion
                        }
                      >
                        <OptionWithChildAsValue>in gel</OptionWithChildAsValue>
                        <OptionWithChildAsValue>on bead</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          in solution
                        </OptionWithChildAsValue>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        Enzyme{" "}
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Other enzyme combinations can be selected if previously discussed with proteomics team"
                        />
                      </label>
                      <select
                        className="form-control"
                        id="enzyme"
                        name="enzyme"
                        required
                        defaultValue={
                          window &&
                          window.existingRequest &&
                          window.existingRequest.enzyme
                        }
                      >
                        <OptionWithChildAsValue>Trypsin</OptionWithChildAsValue>
                        <OptionWithChildAsValue>AspN</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Trypsin AspN
                        </OptionWithChildAsValue>
                        <OptionWithChildAsValue>LysC</OptionWithChildAsValue>
                        <OptionWithChildAsValue>
                          Trypsin LysC
                        </OptionWithChildAsValue>
                      </select>
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-12">
            <div className="group">
              <div className="container">
                <span className="badge" />

                <fieldset>
                  <img src="/img/Attachment.png" className="center" />

                  <h3 className="group-label">Project Summary</h3>

                  <div className="form-group">
                    <label>Project description</label>
                    <textarea
                      className="form-control"
                      type="text"
                      id="projectDescription"
                      name="projectDescription"
                      defaultValue={
                        (window &&
                          window.existingRequest &&
                          window.existingRequest.projectDescription) ||
                        ""
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      What data do you hope to get from this analysis
                    </label>
                    <textarea
                      className="form-control"
                      type="text"
                      id="hopedAnalysis"
                      name="hopedAnalysis"
                      defaultValue={
                        (window &&
                          window.existingRequest &&
                          window.existingRequest.hopedAnalysis) ||
                        ""
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Buffer composition</label>
                    <input
                      className="form-control"
                      type="text"
                      id="bufferComposition"
                      name="bufferComposition"
                      defaultValue={
                        (window &&
                          window.existingRequest &&
                          window.existingRequest.bufferComposition) ||
                        ""
                      }
                    />
                  </div>

                  <div>
                    <label>Supporting Images:</label>
                    {/* <div
                      style={{
                        border: "2px dashed #007bff",
                        padding: "20px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                    >
                      <i>
                        Sorry, file upload is temporarily disabled by the system
                        administrator. It will probably be back before:
                        Wednesday 6th June 2024. Meanwhile, you can email
                        supporting images to george.deeks@tsl.ac.uk who will add
                        them to your form after you have submitted it.
                      </i>
                    </div> */}
                    <ImageUploadForm
                      onImagesChange={handleImagesChange}
                      initialImages={state.supportingImages}
                      supportedFileTypes={supportedFileTypes}
                    />{" "}
                  </div>
                </fieldset>
              </div>
            </div>

            <div className="group">
              <div className="container">
                <fieldset>
                  <img src="/img/Right-Align-Txt.png" className="center" />

                  <h3 className="group-label">New Constructs for Database</h3>

                  <div id="constructs">
                    {state.constructs.map((construct) => (
                      <Construct
                        key={construct.key || construct.id}
                        data={construct}
                        removeConstruct={() => removeConstruct(construct)}
                      />
                    ))}
                  </div>

                  <div
                    className="btn btn-outline-primary btn-block"
                    onClick={addConstruct}
                  >
                    Add Another Construct
                  </div>
                </fieldset>
              </div>
            </div>
          </div>

          <div className="group">
            <div className="container">
              <img src="/img/Guides.png" className="center" />

              <h3 className="group-label">Sample Description</h3>

              <div id="samples">
                {state.samples.map((sample) => (
                  <Sample
                    key={sample.key || sample.id}
                    data={sample}
                    removeSample={() => removeSample(sample)}
                  />
                ))}
              </div>

              <label>Drag to reorder items</label>

              <div
                className="btn btn-outline-primary btn-block"
                onClick={addSample}
              >
                Add Another Sample
              </div>
            </div>
          </div>

          <button
            className="btn btn-lg btn-success"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MyForm;
