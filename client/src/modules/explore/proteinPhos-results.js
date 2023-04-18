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
import { formState, siteState, resultsState } from "./explore.state";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { ExcelFile, ExcelSheet } from "../components/excel-export";
// import ReactExport from "react-data-export";
import PhosDropdown from "../components/phospy-dropdown"

import { useImperativeHandle, useState } from "react";
import _ from "lodash";

// const ExcelFile = ReactExport.ExcelFile;
// const ExcelSheet = ReactExport.ExcelFile.Excelsheet;

export default function ProteinPhosResults() {
  const form = useRecoilValue(formState);
  const tumors = form.cancer;
  const [view, setView] = useState(form.cancer[0].value);

  const [tab, setTab] = useState("summaryView");
  const [plotTab, setPlot] = useState("tumorVsControl");

  const getNumericPosition = (site) => +String(site).match(/\d+/g)[0] || 0;

  const results = useRecoilValue(resultsState);
  const currentTumor = form.cancer.find((e) => e.value === view) ? view : form.cancer[0].value;

  var sortSummary = Object.entries(_.groupBy(results[0].summary.records, "phosphorylationSite"))
    .filter((e) => e[0] !== "null" && e[0] !== "all")
    .sort((a, b) => {
      let first = getNumericPosition(a[0]);
      let second = getNumericPosition(b[0]);

      return first - second;
    });
  //console.log(sortSummary);

  const heatmap = sortSummary.reverse().map((e) => {
    var toAdd = Array(10).fill(null);
    e[1].map((f) => {
      if (f.tumorSampleMean !== null && f.normalSampleMean !== null) {
        const logFoldChange = Number((f.tumorSampleMean - f.normalSampleMean).toFixed(4));
        toAdd[tumors.map((e) => e.value).indexOf(f.cancerId)] = logFoldChange;
      }
    });
    return toAdd;
  });

  function summaryViewData() {
    var rows = [];
   // console.log(results);
    sortSummary.map((c) => {
      c[1].map((e) => {
        const tumor = tumors.find((f) => f.value === e.cancerId);
        rows = rows.concat({
          tumor: (
            <a
              key={"summary-" + tumor.label}
              onClick={() => {
                setView(tumor.value);
                setTab("tumorView");
              }}
              href="javascript:void(0)">
              {tumor.label}
            </a>
          ),
          accession: e.accession ? e.accession : "NA",
          phosphorylationSite: (
            <a
              key={"summary-" + e.phosphorylationSite}
              onClick={() => {
                setView(tumor.value);
                setPhosView(e.phosphorylationSite);
                setTab("phosView");
              }}
              href="javascript:void(0)">
              {e.phosphorylationSite}
            </a>
          ),
          proteinDiff:
            e.tumorSampleMean !== null && e.normalSampleMean !== null
              ? Number((e.tumorSampleMean - e.normalSampleMean).toFixed(4))
              : "NA",
          tumorNum: e.tumorSampleCount !== null ? e.tumorSampleCount : "NA",
          controlNum: e.normalSampleCount !== null ? e.normalSampleCount : "NA",
        });
      });
    });
    return rows;
  }

  const heatMapData = [
    {
      z: heatmap,
      x: tumors.map((e) => e.label),
      y: sortSummary.map((e) => e[0]),
      type: "heatmap",
      hoverongaps: false,
      colorbar: {
        title: {
          text: "Log<sub>2</sub> Fold Change",
        },
      },
      hovertemplate: "Tumor: %{x}<br>Phospho Site: %{y}<br>Log Fold Change: %{z}<extra></extra>",
    },
  ];

  const summaryColumns = [
    {
      accessor: "tumor",
      id: "tumor",
      label: "Tumor Type",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="tumor_type">Tumor Type</Tooltip>}>
          <b>Tumor Type</b>
        </OverlayTrigger>
      ),
      sort: true,
      sortType: (a, b) => (a.original.tumor.key > b.original.tumor.key ? 1 : -1),
    },
    {
      accessor: "phosphorylationSite",
      label: "Phosphorylation Site",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="tumor_type">Phosphorylation Site</Tooltip>}>
          <b>Phospho Site.</b>
        </OverlayTrigger>
      ),
      sort: true,
      sortType: (a, b) => {
        return (
          getNumericPosition(a.original.phosphorylationSite.key) -
          getNumericPosition(b.original.phosphorylationSite.key)
        );
      },
    },
    {
      accessor: "accession",
      label: "Accession",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_accession">Accession</Tooltip>}>
          <b>Accession</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "proteinDiff",
      label: "Log2 Fold Change",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="tumor_type">
              Average Protein Phosphorylation Level Difference (log<sub>2</sub> ratio between Tumor vs Adjacent Normal)
            </Tooltip>
          }>
          <b>
            Log<sub>2</sub> Fold Change
          </b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "tumorNum",
      label: "Tumor Count",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="tumor_type">Tumor Sample Number</Tooltip>}>
          <b>Tumor Count</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "controlNum",
      label: "Normal Count",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="tumor_type">Adjacent Normal Sample Number</Tooltip>}>
          <b>Normal Count</b>
        </OverlayTrigger>
      ),
    },
  ];

  const phosSiteColumns = [
    {
      accessor: "participantId",
      id: "participantId",
      label: "Patient ID",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_patient">Patient ID</Tooltip>}>
          <b>Patient ID</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "tumorValue",
      label: "Tumor Value",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_tumor_val">Tumor Value</Tooltip>}>
          <b>Tumor Value</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "controlValue",
      label: "Normal Value",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_control_val">Normal Value</Tooltip>}>
          <b>Normal Value</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "proteinDiff",
      label: "Log2 Fold Change",
      Header: (
        <OverlayTrigger
          overlay={<Tooltip id="protein_diff">Difference between Tumor and Adjacent Normal Value</Tooltip>}>
          <b>
            Log<sub>2</sub> Fold Change
          </b>
        </OverlayTrigger>
      ),
    },
  ];

  const tumorColumns = [
    {
      accessor: "link",
      id: "link",
      label: "Phosphorylation Site",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_site">Phosphorylation Site</Tooltip>}>
          <b>Phospho. Site</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "phosphopeptide",
      label: "Peptide",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_peptide">Peptide</Tooltip>}>
          <b>Peptide</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "tumorAverage",
      label: "Average Tumor",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_av_tumor">Average Tumor</Tooltip>}>
          <b>Avg. Tumor</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "controlAverage",
      label: "Average Normal",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_av_control">Average Normal</Tooltip>}>
          <b>Avg. Normal</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "proteinDiff",
      label: "Log2 Fold Change",
      Header: (
        <OverlayTrigger
          overlay={
            <Tooltip id="protein_diff">
              Average Protein Phosphorylation Level Difference (log<sub>2</sub> ratio between Tumor vs Adjacent Normal)
            </Tooltip>
          }>
          <b>
            Log<sub>2</sub> Fold Change
          </b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "tumorNum",
      label: "Tumor Count",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_tumor_count">Tumor Sample Number</Tooltip>}>
          <b>Tumor Count</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "controlNum",
      label: "Normal Count",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_control_count">Normal Sample Number</Tooltip>}>
          <b>Normal Count</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "tumorError",
      label: "Tumor SE",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_tumor_se">Tumor Standard Error</Tooltip>}>
          <b>Tumor SE</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "controlError",
      label: "Normal Standard Error",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="phos_control_se">Normal Standard Error</Tooltip>}>
          <b>Normal SE</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "pValuePaired",
      label: "P Value (Paired)",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="protein_pvalue">Mann-Whitney U Test (Paired)</Tooltip>}>
          <b>P Value (Paired)</b>
        </OverlayTrigger>
      ),
    },
    {
      accessor: "pValueUnpaired",
      label: "P Value (Unpaired)",
      Header: (
        <OverlayTrigger overlay={<Tooltip id="protein_pvalue">Mann-Whitney U Test (Unpaired)</Tooltip>}>
          <b>P Value (Unpaired)</b>
        </OverlayTrigger>
      ),
    },
  ];

  const sortPhospho = Object.entries(_.groupBy(results[0].participants.records, "cancerId")).filter(
    (e) => e[0] !== "null",
  );

  const tumorViewData = results[0].summary.records
    .filter(
      (f) =>
        f.cancerId === (form.cancer.find((e) => e.value === view) ? view : form.cancer[0].value) &&
        f.phosphorylationSite !== "all",
    )
    .map((e) => {
      const currentView = form.cancer.find((e) => e.value === view) ? view : form.cancer[0].value;
      const patients = sortPhospho
        .find((f) => Number(f[0]) === currentView)[1]
        .filter((d) => d.phosphorylationSite === e.phosphorylationSite);

      return {
        name: e.phosphorylationSite,
        phosphopeptide: patients.filter((d) => d.phosphopeptide !== null)[0].phosphopeptide,
        accession: patients.filter((d) => d.accession != null)[0].accession,
        tumorAverage: e.tumorSampleMean !== null ? Number(e.tumorSampleMean.toFixed(4)) : "NA",
        controlAverage: e.normalSampleMean !== null ? Number(e.normalSampleMean.toFixed(4)) : "NA",
        proteinDiff:
          e.tumorSampleMean !== null && e.normalSampleMean !== null
            ? Number((e.tumorSampleMean - e.normalSampleMean).toFixed(4))
            : "NA",
        link: (
          <a
            onClick={() => {
              setPhosView(e.phosphorylationSite);
              setTab("phosView");
              setSite(patients.filter((d) => d.phosphopeptide !== null)[0]);
            }}
            href="javascript:void(0)">
            {e.phosphorylationSite}
          </a>
        ),
        pValuePaired:
          e.pValuePaired !== null
            ? Number(e.pValuePaired.toFixed(4)) < 0.0001
              ? "< 0.0001"
              : Number(e.pValuePaired.toFixed(4))
            : "NA",
        pValueUnpaired:
          e.pValueUnpaired !== null
            ? Number(e.pValueUnpaired.toFixed(4)) < 0.0001
              ? "< 0.0001"
              : Number(e.pValueUnpaired.toFixed(4))
            : "NA",
        tumorNum: e.tumorSampleCount !== null ? Number(e.tumorSampleCount.toFixed(4)) : "NA",
        controlNum: e.normalSampleCount !== null ? Number(e.normalSampleCount.toFixed(4)) : "NA",
        tumorError: e.tumorSampleStandardError !== null ? Number(e.tumorSampleStandardError.toFixed(4)) : "NA",
        controlError: e.normalSampleStandardError !== null ? Number(e.normalSampleStandardError.toFixed(4)) : "NA",
        records: patients,
      };
    })
    .sort((a, b) => {
      let first = getNumericPosition(a.name);
      let second = getNumericPosition(b.name);

      return first - second;
    });

  const [phosView, setPhosView] = useState(tumorViewData.length > 0 ? tumorViewData[0].name : "");
  const [site, setSite] = useState(tumorViewData.length > 0 ? tumorViewData[0] : "");

  /*
  const siteTableData =
    tumorViewData.length && tumorViewData.find((e) => e.name === phosView)
      ? tumorViewData
          .find((e) => e.name === phosView)
          .records.map((e) => {
            const proteinValues = results
              .find((d) => d.cancer.value === e.cancerId)
              .participants.records.find(
                (f) => f.participantId === e.participantId,
              );

            if (
              proteinValues &&
              proteinValues.tumorValue !== null &&
              proteinValues.normalValue !== null
            ) {
              const tumorValue = Number(
                (e.tumorValue - proteinValues.tumorValue).toFixed(4),
              );
              const normalValue = Number(
                (e.normalValue - proteinValues.normalValue).toFixed(4),
              );

              return {
                participantId: e.participantId,
                tumorValue: tumorValue,
                normalValue: normalValue,
                proteinDiff: Number((tumorValue - normalValue).toFixed(4)),
              };
            } else return null;
          })
          .filter((e) => e !== null)
      : [];*/

  const multiPhosBarPlot = [
    {
      x: tumorViewData.map((c) => c.name),
      y: tumorViewData.map((c) => c.tumorAverage),
      error_y: {
        type: "data",
        array: tumorViewData.map((c) => c.tumorError),
        visible: true,
        color: "rgb(255,0,0)",
      },
      marker: {
        color: "rgb(255,0,0)",
      },
      type: "bar",
      name: "Tumor",
      hovertemplate: "%{x}: %{y} <extra></extra>",
    },
    {
      x: tumorViewData.map((c) => c.name),
      y: tumorViewData.map((c) => c.controlAverage),
      error_y: {
        type: "data",
        array: tumorViewData.map((c) => c.controlError),
        visible: true,
        color: "rgb(31,119,180)",
      },
      marker: {
        color: "rgb(31,119,180)",
      },
      type: "bar",
      name: "Normal",
      hovertemplate: "%{x}: %{y} <extra></extra>",
    },
  ];

  function phosBoxData() {
    if (tumorViewData.find((e) => e.name === phosView)) {
      return [
        {
          y: tumorViewData.length
            ? tumorViewData.find((e) => e.name === phosView).records.map((d) => d.tumorValue)
            : [],
          type: "box",
          boxpoints: "all",
          name: "<b>Tumor</b>",
          jitter: 0.6,
          marker: {
            size: 10,
            color: "rgb(255,0,0)",
          },
          text: tumorViewData.length
            ? tumorViewData.find((e) => e.name === phosView).records.map((d) => d.participantId)
            : [],
          hovertemplate: "Patient ID: %{text}<br>Tumor Abundance: %{y}<extra></extra>",
        },
        {
          y: tumorViewData.length
            ? tumorViewData.find((e) => e.name === phosView).records.map((d) => d.normalValue)
            : [],
          type: "box",
          boxpoints: "all",
          name: "<b>Normal</b>",
          jitter: 0.6,
          marker: {
            size: 10,
            color: "rgb(31,119,180)",
          },
          text: tumorViewData.length
            ? tumorViewData.find((e) => e.name === phosView).records.map((d) => d.participantId)
            : [],
          hovertext: ["1", "2"],
          hoverinfo: "x+y",
          hovertemplate: "Patient ID: %{text}<br>Normal Abundance: %{y}<extra></extra>",
        },
      ];
    }
  }

  function handleToggle(e) {
    setPlot(e.target.control.id);
  }

  function foldData() {
    if (tumorViewData.find((c) => c.name === phosView)) {
      var caseList = tumorViewData
        .find((c) => c.name === phosView)
        .records.filter((e) => e.tumorValue !== null && e.normalValue !== null)
        .sort((a, b) => {
          const aFoldChange = a.tumorValue - a.normalValue;
          const bFoldChange = b.tumorValue - b.normalValue;

          return aFoldChange > bFoldChange ? 1 : -1;
        });

      const values = caseList.map((c) =>
        Number((Number(c.tumorValue.toFixed(4)) - Number(c.normalValue.toFixed(4))).toFixed(4)),
      );

      return [
        {
          type: "bar",
          x: values,
          y: caseList.map((c) => c.participantId),
          marker: {
            color: values.map((c) => (c > 0 ? "rgb(255,0,0)" : "rgb(31,119,180)")),
          },
          orientation: "h",
          hovertemplate: "Patient ID: %{y}<br>Log Fold Change: %{x}<extra></extra>",
        },
        {
          type: "bar",
          x: values,
          y: caseList.map((c) => c.participantId),
          marker: {
            color: values.map((c) => (c > 0 ? "rgb(255,0,0)" : "rgb(31,119,180)")),
          },
          xaxis: "x2",
          orientation: "h",
          hovertemplate: "Patient ID: %{y}<br>Log Fold Change: %{x}<extra></extra>",
        },
      ];
    } else return [];
  }

  const defaultLayout = {
    xaxis: {
      zeroline: false,
      tickfont: {
        size: 16,
      },
    },
    yaxis: {
      title: "Protein Abundance",
      zeroline: false,
    },
    legend: {
      itemsizing: "constant",
      itemwidth: 40,
    },
    hovermode: "closest",
    hoverlabel: {
      bgcolor: "#FFF",
      font: { color: "#000", size: 16 },
      bordercolor: "#D3D3D3",
      nameLength: 0,
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
    modeBarButtonsToRemove: ["select2d", "lasso2d", "hoverCompareCartesian", "hoverClosestCartesian"],
  };

  function exportSummarySettings() {
    var settings = form.cancer.map((e) => {
      return [{ value: e.label }];
    });

    settings[0].push({ value: "Phosphorylation/Protein" });
    settings[0].push({ value: "Tumor vs Control" });
    settings[0].push({ value: form.gene.label });

    return [
      {
        columns: [
          { title: "Tumors", width: { wpx: 160 } },
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
      columns: summaryColumns.map((e) => {
        return { title: e.label, width: { wpx: 200 } };
      }),
      data: summaryViewData().map((e) => {
        return [
          { value: e.tumor.props.children },
          { value: e.phosphorylationSite.props.children },
          { value: e.accession },
          { value: e.proteinDiff },
          { value: e.tumorNum },
          { value: e.controlNum },
        ];
      }),
    },
  ];

  function exportTumorSettings() {
    return [
      {
        columns: [
          { title: "Tumor", width: { wpx: 160 } },
          { title: "Dataset", width: { wpx: 160 } },
          { title: "Analysis", width: { wpx: 160 } },
          { title: "Gene", width: { wpx: 160 } },
        ],
        data: [
          [
            {
              value: form.cancer.find((e) => e.value === view)
                ? form.cancer.find((e) => e.value === view).label
                : form.cancer[0].label,
            },
            { value: "Phosphorylation/Protein" },
            { value: "Tumor vs Control" },
            { value: form.gene.label },
          ],
        ],
      },
    ];
  }

  const exportTumor = [
    {
      columns: tumorColumns.map((e) => {
        return { title: e.label, width: { wpx: 200 } };
      }),
      data: tumorViewData.map((e) => {
        return [
          { value: e.name },
          { value: e.phosphopeptide },
          { value: e.tumorAverage },
          { value: e.controlAverage },
          { value: e.proteinDiff },
          { value: e.tumorNum },
          { value: e.controlNum },
          { value: e.tumorError },
          { value: e.controlError },
          { value: e.pValuePaired },
          { value: e.pValueUnpaired },
        ];
      }),
    },
  ];

  const exportSiteSettings = [
    {
      columns: [
        { title: "Tumor Type", width: { wpx: 160 } },
        { title: "Phosphorylation Site", width: { wpx: 200 } },
        { title: "Dataset", width: { wpx: 160 } },
        { title: "Analysis", width: { wpx: 160 } },
        { title: "Gene", width: { wpx: 160 } },
      ],
      data: [
        [
          {
            value: form.cancer.find((e) => e.value === view)
              ? form.cancer.find((e) => e.value === view).label
              : form.cancer[0].label,
          },
          { value: phosView },
          { value: "Phosphorylation/Protein" },
          { value: "Tumor vs Control" },
          { value: form.gene.label },
        ],
      ],
    },
  ];

  function exportSite() {
    return [
      {
        columns: phosSiteColumns.map((e) => {
          return { title: e.label, width: { wpx: 160 } };
        }),
        data:
          tumorViewData.length && tumorViewData.find((e) => e.name === phosView)
            ? tumorViewData
                .find((e) => e.name === phosView)
                .records.map((d) => {
                  return [
                    { value: d.participantId },
                    {
                      value: d.tumorValue ? Number(d.tumorValue.toFixed(4)) : "NA",
                    },
                    {
                      value: d.normalValue ? Number(d.normalValue.toFixed(4)) : "NA",
                    },
                    {
                      value:
                        d.tumorValue && d.normalValue
                          ? Number((Number(d.tumorValue.toFixed(4)) - Number(d.normalValue.toFixed(4))).toFixed(4))
                          : "NA",
                    },
                  ];
                })
            : [],
      },
    ];
  }

  return (
    <Tabs activeKey={tab} onSelect={(e) => setTab(e)} className="mb-3">
      <Tab eventKey="summaryView" title="Summary View">
        <div className="m-3">
          <div style={{ height: "800px", overflowY: "auto" }}>
            <Plot
              data={heatMapData}
              layout={{
                ...defaultLayout,
                title: `<b>${form.gene.label} Phosphorylation/Protein Summary View</b>`,
                xaxis: {
                  automargin: true
                },
                yaxis: {
                  title: "<b>Phosphorylation Site</b>",
                  automargin: true,
                  tickfont: {
                    size: 15,
                  },
                  titlefont: {
                    size: 16,
                  },
                },
                autosize: true,
              }}
              useResizeHandler
              config={{
                ...defaultConfig,
                toImageButtonOptions: {
                  ...defaultConfig.toImageButtonOptions,
                  filename: `Phosphorylation_Protein_Tumor_vs_Adjacent_Normal-${form.gene.label}`,
                },
              }}
              style={{
                height: sortSummary.length ? `${sortSummary.length * 25}px` : "800px",
                minHeight: "800px",
                width: `100%`,
                minWidth: "100%",
              }}
            />
          </div>
          <div className="mx-3" style={{ color: "grey" }}>
            Note: Fold Change may not be statistically significant.
          </div>
        </div>

        <div className="m-3">
          <div className="d-flex" style={{ justifyContent: "flex-end" }}>
            <ExcelFile
              filename={`Phosphorylation_Protein_Tumor_vs_Adjacent_Normal-${form.gene.label}`}
              element={<a href="javascript:void(0)">Export Data</a>}>
              <ExcelSheet dataSet={exportSummarySettings()} name="Input Configuration" />
              <ExcelSheet dataSet={exportSummary} name="Summary Data" />
            </ExcelFile>
          </div>

          <Table columns={summaryColumns} defaultSort={[{ id: "tumor", asec: true }]} data={summaryViewData()} />
        </div>
      </Tab>
      <Tab eventKey="tumorView" title="Tumor View">
        <Form.Group className="row mx-3 m-3" controlId="phosSiteView">
           <Row>
          <Col lg={tumors.length >1? 6:'auto'}  className="p-2">
          {tumors.length >1? 
            <PhosDropdown form={form} 
            sortResults={sortPhospho} 
            view = {view} 
            setView ={setView} 
            setPhosView={setPhosView}
            setSite={setSite}
            controlid="phosphySiteProteinPhosDropdown"/>
          :''}
            </Col>
            <ToggleButtonGroup
            type="radio"
            name="plot-tab"
            value={plotTab}
            className="col-xl-6 p-2"
            style={{ whiteSpace: "nowrap" }}>
            <ToggleButton
              className={plotTab === "tumorVsControl" ? "btn-primary" : "btn-secondary"}
              id={"tumorVsControl"}
              onClick={handleToggle}>
              Tumor vs Adj. Normal
            </ToggleButton>
            <ToggleButton
              className={plotTab === "foldChange" ? "btn-primary" : "btn-secondary"}
              id={"foldChange"}
              onClick={handleToggle}>
              Log<sub>2</sub> Fold Change
            </ToggleButton>
          </ToggleButtonGroup>
          </Row>
        </Form.Group>

        <Row className="m-3">
          <Col xl={12} style={{ overflowX: "auto" }}>
            <Plot
              data={multiPhosBarPlot}
              layout={{
                ...defaultLayout,
                title: `<b>${form.gene.label} ${
                  form.cancer.find((f) => f.value === currentTumor).label
                } Phosphorylation/Protein</b>`,
                xaxis: {
                  title: "<b>Phosphorylation Site</b>",
                  zeroline: false,
                  titlefont: {
                    size: 16,
                  },
                  tickfont: {
                    size: 15,
                  },
                },
                yaxis: {
                  title: "<b>Phosphorylation/Protein Level</b>",
                  zeroline: false,
                  titlefont: {
                    size: 16,
                  },
                },
                barmode: "group",
                autosize: true,
                legend: {
                  orientation: "h",
                  y: -0.25,
                  x: 0.42,
                },
                annotations: [
                  {
                    text: tumorViewData.length === 0 ? "No data available" : "",
                    xref: "paper",
                    yref: "paper",
                    showarrow: false,
                    font: {
                      size: 28,
                      color: "grey",
                    },
                  },
                ],
              }}
              config={{
                ...defaultConfig,
                toImageButtonOptions: {
                  ...defaultConfig.toImageButtonOptions,
                  filename: `${
                    form.cancer.find((f) => f.value === currentTumor).label
                  }_Phosphorylation_Protein_Tumor_vs_Adjacent_Normal-${form.gene.label}`,
                },
              }}
              useResizeHandler
              className="flex-fill w-100"
              style={{
                height: "500px",
                width: `${tumorViewData.length * 50}px`,
                minWidth: "100%",
              }}
            />
          </Col>
        </Row>
        <div className="m-3">
          <div className="d-flex" style={{ justifyContent: "flex-end" }}>
            <ExcelFile
              filename={`${
                form.cancer.find((f) => f.value === currentTumor).label
              }_Phosphorylation_Protein_Tumor_vs_Adjacent_Normal-${form.gene.label}`}
              element={<a href="javascript:void(0)">Export Data</a>}>
              <ExcelSheet dataSet={exportTumorSettings()} name="Input Configuration" />
              <ExcelSheet dataSet={exportTumor} name="Tumor View Data" />
            </ExcelFile>
          </div>
          <Table columns={tumorColumns} data={tumorViewData} defaultSort={[{ id: "link", asec: true }]} />
        </div>
      </Tab>
      <Tab eventKey="phosView" title="Phosphorylation Site">
        <Form.Group className="row mx-3 m-3" controlId="ProteinPhos_phosView">
            <Row >
             <Col lg={tumors.length >1? 6:'auto'} className="p-2">
          {tumors.length >1? 
            <PhosDropdown form={form} 
            sortResults={sortPhospho} 
            view = {view} 
            setView ={setView} 
            setPhosView={setPhosView}
            setSite={setSite}
            controlid="tumorProteinPhosDropdown"/>
          :''}
          </Col>
          <Form.Label className="col-xl-1 col-xs-12 col-form-label m-2" style={{ minWidth: "160px", whiteSpace: "nowrap" }}>
            Phosphorylation Site
          </Form.Label>
          <div className="col-xl-2 p-2">
            <Form.Select
              name="phosView"
              onChange={(e) => {
                setPhosView(e.target.value);
                setSite(tumorViewData.find((c) => c.name === e.target.value));
              }}
              value={phosView}
              required>
              {tumorViewData.map((c) => (
                <option value={c.name} key={`dataset-${c.name}`}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
          </div>
                    
          <ToggleButtonGroup
            type="radio"
            name="plot-tab"
            value={plotTab}
            className="col-xl-6 p-2"
            style={{ whiteSpace: "nowrap" }}>
            <ToggleButton
              className={plotTab === "tumorVsControl" ? "btn-primary" : "btn-secondary"}
              id={"tumorVsControl"}
              onClick={handleToggle}>
              Tumor vs Adj. Normal
            </ToggleButton>
            <ToggleButton
              className={plotTab === "foldChange" ? "btn-primary" : "btn-secondary"}
              id={"foldChange"}
              onClick={handleToggle}>
              Log<sub>2</sub> Fold Change
            </ToggleButton>
          </ToggleButtonGroup>
          </Row>
        </Form.Group>
        
        <Row className="mx-3 mt-3">
          {plotTab === "tumorVsControl" ? (
            <Col xl={12} style={{ height: "800px" }}>
              <Plot
                data={phosBoxData()}
                layout={{
                  ...defaultLayout,
                  title: `<b>${form.gene.label} ${phosView} ${
                    form.cancer.find((f) => f.value === currentTumor).label
                  }</b><br>(Unpaired P-Value: ${
                    tumorViewData.find((e) => e.name === phosView)
                      ? tumorViewData.find((e) => e.name === phosView).pValueUnpaired
                      : "NA"
                  })`,
                  yaxis: {
                    title: "<b>Phosphorylation/Protein Level</b>",
                    zeroline: false,
                    titlefont: {
                      size: 16,
                    },
                  },
                  autosize: true,
                  boxgroupgap: 0.4,
                  boxgap: 0.4,
                  legend: {
                    orientation: "h",
                    y: -0.1,
                    x: 0.41,
                    font: { size: 15 },
                  },
                  annotations: [
                    {
                      text:
                        tumorViewData.length === 0 ||
                        !tumorViewData.find((e) => e.name === phosView) ||
                        tumorViewData.find((e) => e.name === phosView).records.length === 0
                          ? "No data available"
                          : "",
                      xref: "paper",
                      yref: "paper",
                      showarrow: false,
                      font: {
                        size: 28,
                        color: "grey",
                      },
                    },
                  ],
                }}
                config={{
                  ...defaultConfig,
                  toImageButtonOptions: {
                    ...defaultConfig.toImageButtonOptions,
                    filename: `${phosView}_${
                      form.cancer.find((f) => f.value === currentTumor).label
                    }_Phosphorylation_Protein_Tumor_vs_Adjacent_Normal-${form.gene.label}`,
                  },
                }}
                useResizeHandler
                style={{ height: "800px", minWidth: "100%" }}
              />
            </Col>
          ) : (
            <Col xl={12} style={{ height: "800px", overflowY: "auto" }}>
              <Plot
                data={foldData()}
                config={defaultConfig}
                layout={{
                  autosize: true,
                  title: `<b>${form.gene.label} ${phosView} ${
                    form.cancer.find((f) => f.value === currentTumor).label
                  } Log<sub>2</sub> Fold Change</b><br>(Paired P-Value: ${
                    tumorViewData.find((e) => e.name === phosView)
                      ? tumorViewData.find((e) => e.name === phosView).pValuePaired
                      : "NA"
                  })`,
                  xaxis: {
                    title: "<b>Log<sub>2</sub> Fold Change</b>",
                    zeroline: false,
                    titlefont: {
                      size: 16,
                    },
                    tickfont: {
                      size: 14,
                    },
                  },
                  xaxis2: {
                    zeroline: false,
                    overlaying: "x",
                    side: "top",
                  },
                  yaxis: {
                    tickfont: {
                      size: 14,
                    },
                    automargin: true,
                    type: "category",
                  },
                  showlegend: false,
                  barmode: "stack",
                  hoverlabel: {
                    bgcolor: "#FFF",
                    font: { color: "#000", size: 16 },
                    bordercolor: "#D3D3D3",
                    nameLength: 0,
                  },
                  annotations: [
                    {
                      text:
                        tumorViewData.length === 0 ||
                        !tumorViewData.find((e) => e.name === phosView) ||
                        tumorViewData
                          .find((c) => c.name === phosView)
                          .records.filter((e) => e.tumorValue !== null && e.normalValue !== null).length === 0
                          ? "No data available"
                          : "",
                      xref: "paper",
                      yref: "paper",
                      showarrow: false,
                      font: {
                        size: 28,
                        color: "grey",
                      },
                    },
                  ],
                }}
                useResizeHandler
                style={{
                  minWidth: "100%",
                  height: `${foldData().length ? foldData()[0].x.length * 25 : "700"}px`,
                  minHeight: "700px",
                }}
              />
            </Col>
          )}
        </Row>
        <fieldset className="mx-5 mb-5 border row" style={{ color: "grey" }}>
          <div className="col-xl-6 my-2 d-flex justify-content-center">Accession: {site.accession}</div>

          <div className="col-xl-6 my-2 d-flex justify-content-center">Peptide: {site.phosphopeptide}</div>
        </fieldset>

        <Row className="m-3">
          <div className="d-flex" style={{ justifyContent: "flex-end" }}>
            <ExcelFile
              filename={`${phosView}_${
                form.cancer.find((f) => f.value === currentTumor).label
              }_Phosphorylation_Protein_Tumor_vs_Adjacent_Normal-${form.gene.label}`}
              element={<a href="javascript:void(0)">Export Data</a>}>
              <ExcelSheet dataSet={exportSiteSettings} name="Input Configuration" />
              <ExcelSheet dataSet={exportSite()} name="Phosphorylation/Protein Site" />
            </ExcelFile>
          </div>
          <Table
            columns={phosSiteColumns}
            defaultSort={[{ id: "participantId", asec: true }]}
            data={
              tumorViewData.length && tumorViewData.find((e) => e.name === phosView)
                ? tumorViewData
                    .find((e) => e.name === phosView)
                    .records.map((d) => {
                      return {
                        participantId: d.participantId,
                        tumorValue: d.tumorValue ? Number(d.tumorValue.toFixed(4)) : "NA",
                        controlValue: d.normalValue ? Number(d.normalValue.toFixed(4)) : "NA",
                        proteinDiff:
                          d.tumorValue && d.normalValue
                            ? Number((Number(d.tumorValue.toFixed(4)) - Number(d.normalValue.toFixed(4))).toFixed(4))
                            : "NA",
                      };
                    })
                : []
            }
          />
        </Row>
      </Tab>
    </Tabs>
  );
}
