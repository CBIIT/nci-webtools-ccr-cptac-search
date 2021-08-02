import { useRecoilValue } from "recoil";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Form from "react-bootstrap/Form";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import ToggleButton from "react-bootstrap/esm/ToggleButton";
import Table from "../components/table";
import Plot from "react-plotly.js";
import { proteinState, rnaState, formState } from "./explore.state";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import calculateCorrelation from "calculate-correlation";
import ReactExport from "react-data-export";

import { useState } from "react";
import _ from "lodash";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.Excelsheet;

export default function ProteinCorrelation() {
  const form = useRecoilValue(formState);
  const proteinData = useRecoilValue(proteinState);
  const rnaData = useRecoilValue(rnaState);
  const compareGene = form.correlatedGene;
  const type = form.correlation;

  const [view, setView] = useState(form.cancer[0].value);
  const [tab, setTab] = useState("summary");
  const [numType, setNumType] = useState("log2");

  function handleToggle(e) {
    setNumType(e.target.id);
  }

  const correlationColumns = [
    {
      accessor: "name",
      label: "Patient ID",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_correlation_patient">Patient ID</Tooltip>
          }>
          <b>Patient ID</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "proteinTumorNum",
      label: "Protein Tumor Abundance",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_correlation_tumor_num">
              Protein Tumor Abundance
            </Tooltip>
          }>
          <b>Protein Tumor Abundance</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "proteinTumor",
      label: "Protein Tumor Log2",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_correlation_tumor_log2">
              Protein Tumor Log<sub>2</sub>
            </Tooltip>
          }>
          <b>
            Protein Tumor Log<sub>2</sub>
          </b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "rnaTumorNum",
      label: "RNA Tumor Abundance",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_rna_tumor_num">RNA Tumor Abundance</Tooltip>
          }>
          <b>RNA Tumor Abundance</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "rnaTumor",
      label: "RNA Tumor Log2",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_rna_tumor_log2">
              RNA Tumor (Log<sub>2</sub>)
            </Tooltip>
          }>
          <b>
            RNA Tumor Log<sub>2</sub>
          </b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "proteinControlNum",
      label: "Protein Adjacent Normal Abundance",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_correlation_control_num">
              Protein Adjacent Normal Abundance
            </Tooltip>
          }>
          <b>Protein Adjacent Normal Abundance</b>
        </OverlayTrigger>
      ),
    },

    {
      accessor: "proteinControl",
      label: "Protein Adjacent Normal Log2",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_correlation_control_log2">
              Protein Adjacent Normal Log<sub>2</sub>
            </Tooltip>
          }>
          <b>
            Protein Adjacent Normal Log<sub>2</sub>
          </b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "rnaControlNum",
      label: "RNA Adjacent Normal Abundance",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_rna_contro_num">
              RNA Adjacent Normal Abundance
            </Tooltip>
          }>
          <b>RNA Adjacent Normal Abundance</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "rnaControl",
      label: "RNA Adjacent Normal Log2",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_rna_contro_log2">
              RNA Adjacent Normal (Log<sub>2</sub>)
            </Tooltip>
          }>
          <b>
            RNA Adjacent Normal Log<sub>2</sub>
          </b>
        </OverlayTrigger>
      ),
    },
  ];

  //Organize datasets (unfiltered)
  const getData = proteinData.map((e) => {
    const rna = rnaData.find((d) => {
      return e.name === d.name;
    });

    return {
      name: e.name,
      proteinTumor: e.tumorValue,
      proteinTumorNum: Number(Math.pow(2, e.tumorValue).toFixed(4)),
      proteinControl: e.normalValue,
      proteinControlNum: Number(Math.pow(2, e.normalValue).toFixed(4)),
      //Converting rna value to log values, may not need to do this depending on values from actual dataset
      rnaTumor: Number(Math.log2(rna.tumorValue).toFixed(4)),
      rnaTumorNum: rna.tumorValue,
      rnaControl: Number(Math.log2(rna.normalValue).toFixed(4)),
      rnaControlNum: rna.normalValue,
    };
  });

  //Filter points with missing data points that would cause issues with correlation calculation
  const proteinRNA = getData.filter(
    (e) =>
      typeof e.proteinTumor === "number" &&
      typeof e.rnaTumor === "number" &&
      typeof e.proteinControl === "number" &&
      typeof e.rnaControl === "number",
  );

  const defaultLayout = {
    xaxis: {
      title: "Protein",
      zeroline: false,
    },
    yaxis: {
      title: "mRNA",
      zeroline: false,
    },
    legend: {
      itemsizing: "constant",
      itemwidth: 40,
    },
    hovermode: "closest",
    hoverlabel: {
      bgcolor: "#FFF",
      font: { color: "#000" },
      bordercolor: "#D3D3D3",
    },
  };

  const defaultConfig = {
    displayModeBar: true,
    toImageButtonOptions: {
      format: "svg",
      filename: "plot_export",
      height: 1000,
      width: 1000,
      scale: 1,
    },
    displaylogo: false,
    modeBarButtonsToRemove: [
      "select2d",
      "lasso2d",
      "hoverCompareCartesian",
      "hoverClosestCartesian",
    ],
  };

  function exportSummarySettings() {
    var settings = form.cancer.map((e) => {
      return [{ value: e.label }];
    });
    settings[0].push({ value: "Protein Abundance" });
    settings[0].push({ value: "Correlation" });
    settings[0].push({ value: form.gene.label });

    return [
      {
        columns: [
          { title: "Tumor", width: { wpx: 160 } },
          { title: "Dataset", width: { wpx: 160 } },
          { title: "Analysis", width: { wpx: 160 } },
          { title: "Gene", width: { wpx: 160 } },
        ],
        data: settings,
      },
    ];
  }

  const exportSummary = [
    {
      columns: correlationColumns.map((e) => {
        return { title: e.label, width: { wpx: 160 } };
      }),
      data: proteinRNA.map((e) => {
        return [
          { value: e.name },
          { value: e.proteinTumorNum },
          { value: e.proteinTumor },
          { value: e.rnaTumorNum },
          { value: e.rnaTumor },
          { value: e.proteinControlNum },
          { value: e.proteinControl },
          { value: e.rnaControlNum },
          { value: e.rnaControl },
        ];
      }),
    },
  ];

  const proteinRNAScatter = [
    {
      x: proteinRNA.map((e) =>
        numType === "log2" ? e.proteinTumor : Math.pow(2, e.proteinTumor),
      ),
      y: proteinRNA.map((e) =>
        numType === "log2" ? e.rnaTumor : Math.pow(2, e.rnaTumor),
      ),
      mode: "markers",
      type: "scatter",
      name: "Tumor",
      hovertemplate: "(%{x},%{y})<extra></extra>",
    },
    {
      x: proteinRNA.map((e) =>
        numType === "log2" ? e.proteinControl : Math.pow(2, e.proteinControl),
      ),
      y: proteinRNA.map((e) =>
        numType === "log2" ? e.rnaControl : Math.pow(2, e.rnaControl),
      ),
      mode: "markers",
      type: "scatter",
      name: "Adjacent Normal",
      hovertemplate: "(%{x},%{y})<extra></extra>",
    },
  ];

  return (
    <Tabs activeKey={tab} onSelect={(e) => setTab(e)} className="mb-3">
      <Tab eventKey="summary" title="Correlation">
        <Form.Group className="row mx-3" controlId="tumorView">
          <Form.Label
            className="col-xl-1 col-xs-12 col-form-label"
            style={{ minWidth: "120px" }}>
            Tumor Type
          </Form.Label>
          <div className="col-xl-3">
            <Form.Select
              name="caseView"
              onChange={(e) => {
                setView(parseInt(e.target.value));
              }}
              value={view}
              required>
              {form.cancer.map((o) => (
                <option value={o.value} key={`dataset-${o.value}`}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </div>
          {/*<ToggleButtonGroup
            type="radio"
            name="plot-tab"
            value={numType}
            className="col-xl-5">
            <ToggleButton
              className={numType === "log2" ? "btn-primary" : "btn-secondary"}
              id={"log2"}
              onClick={handleToggle}>
              Log<sub>2</sub> vs Log<sub>2</sub>
            </ToggleButton>
            <ToggleButton
              className={
                numType === "numeric" ? "btn-primary" : "btn-secondary"
              }
              id={"numeric"}
              onClick={handleToggle}>
              Numeric vs Numeric
            </ToggleButton>
            </ToggleButtonGroup>*/}
          <Form.Group className="col-xl-6 mb-3 col-form-label">
            <Form.Check
              inline
              label={
                <span>
                  Log<sub>2</sub> vs Log<sub>2</sub>
                </span>
              }
              type="radio"
              id="log2"
              value="numType"
              checked={numType === "log2"}
              onChange={handleToggle}
            />

            <Form.Check
              inline
              label="Numeric vs Numeric"
              type="radio"
              id="numeric"
              value="numType"
              checked={numType === "numeric"}
              onChange={handleToggle}
            />
          </Form.Group>
        </Form.Group>

        <Row className="mx-3 mt-3">
          <Col xl={12}>
            <Plot
              data={proteinRNAScatter}
              layout={{
                ...defaultLayout,
                title: `<b>Protein and mRNA Correlation</b> (Gene: ${form.gene.label})`,
                autosize: true,
              }}
              config={defaultConfig}
              useResizeHandler
              className="flex-fill w-100"
              style={{ height: "500px" }}
            />
          </Col>
        </Row>

        <fieldset className="mx-5 mb-5 border" style={{ color: "grey" }}>
          <Row>
            <div className="col-xl-4 my-2 d-flex justify-content-center">
              Tumor Correlation:{" "}
              {calculateCorrelation(
                proteinRNA.map((e) =>
                  numType === "log2"
                    ? e.proteinTumor
                    : Math.pow(2, e.proteinTumor),
                ),
                proteinRNA.map((e) =>
                  numType === "log2" ? e.rnaTumor : Math.pow(2, e.rnaTumor),
                ),
                { decimals: 4 },
              )}
            </div>
            <div className="col-xl-4 my-2 d-flex justify-content-center">
              Control Correlation:{" "}
              {calculateCorrelation(
                proteinRNA.map((e) =>
                  numType === "log2"
                    ? e.proteinControl
                    : Math.pow(2, e.proteinControl),
                ),
                proteinRNA.map((e) =>
                  numType === "log2" ? e.rnaControl : Math.pow(2, e.rnaControl),
                ),
                { decimals: 4 },
              )}
            </div>

            <div className="col-xl-4 my-2 d-flex justify-content-center">
              Total Correlation:{" "}
              {calculateCorrelation(
                proteinRNA
                  .map((e) =>
                    numType === "log2"
                      ? e.proteinControl
                      : Math.pow(2, e.proteinControl),
                  )
                  .concat(
                    proteinRNA.map((e) =>
                      numType === "log2"
                        ? e.proteinTumor
                        : Math.pow(2, e.proteinTumor),
                    ),
                  ),
                proteinRNA
                  .map((e) =>
                    numType === "log2" ? e.rnaControl : e.rnaControl,
                  )
                  .concat(
                    proteinRNA.map((e) =>
                      numType === "log2" ? e.rnaTumor : Math.pow(2, e.rnaTumor),
                    ),
                  ),
                { decimals: 4 },
              )}
            </div>
          </Row>
        </fieldset>

        <div className="m-3">
          <div className="d-flex" style={{ justifyContent: "right" }}>
            <ExcelFile element={<a href="javascript:void(0)">Export Data</a>}>
              <ExcelSheet
                dataSet={exportSummarySettings()}
                name="Input Configuration"
              />
              <ExcelSheet dataSet={exportSummary} name="Summary Data" />
            </ExcelFile>
          </div>
          <Table
            columns={correlationColumns}
            data={proteinRNA.map((c) => {
              return {
                name: c.name,
                proteinTumor: c.proteinTumor,
                proteinTumorNum: c.proteinTumorNum,
                proteinControl: c.proteinControl,
                proteinControlNum: c.proteinControlNum,
                rnaTumor: c.rnaTumor,
                rnaTumorNum: c.rnaTumorNum,
                rnaControl: c.rnaControl,
                rnaControlNum: c.rnaControlNum,
              };
            })}
          />
        </div>
      </Tab>
    </Tabs>
  );
}
