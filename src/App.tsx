import './App.css';
import { 
    AnnualMeasurements,
    HourlyIrradianceByMonth,
    HourlyMeasurementsByMonth,
    HourlyUsageByMonth,
    PhaseConfigurationOption,
    PricingConfiguration,
    SolarConfiguration,
    SummableHourlyMeasurementsByMonth,
    ViewDimensions,
    WaterCylinderSource
} from './types';
import { getAnnualMeasurements, getCumulativeHourlyMeasurementsByMonth, getHourlyMeasurementsByMonth } from './calculations';
import { MonthlyChart } from './MonthlyChart';
import { useEffect, useState } from 'react';
import { Config } from './Config';
import { getHourlyIrradianceByMonth, getHourlyUsageByMonth } from './sourceData';

const viewDimensions: ViewDimensions = {
    svgWidth: 900,
    svgHeight: 500,
    margin: {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
    }
};

interface LoadingData {
    hourlyUsageByMonth: HourlyUsageByMonth
    hourlyIrradianceByMonth: HourlyIrradianceByMonth
}

interface CalculatedData {
    hourlyMeasurementsByMonth: HourlyMeasurementsByMonth
    cumulativeHourlyMeasurementsByMonth: SummableHourlyMeasurementsByMonth
    annualMeasurements: AnnualMeasurements
}

export default function App() {
    const [loadingData, setLoadingData] = useState<LoadingData | null>(null);
    const [calculatedData, setCalculatedData] = useState<CalculatedData | null>(null);
    const [displayCumulative, setDisplayCumulative] = useState(false);

    const [solarConfig, setSolarConfig] = useState<SolarConfiguration>({
        northWestNumberOfPanels: 14,
        northEastNumberOfPanels: 0,
        panelRatingW: 410,
        singlePanelAreaSqm: 1.92,
        batteryCapacityKWh: 5.4,
        waterCylinderSource: WaterCylinderSource.Phase1,
        phaseConfiguration: PhaseConfigurationOption.ThreePhaseInverterBalanced
    });

    const [pricingConfig, setPricingConfig] = useState<PricingConfiguration>({
        gridPricePerUnit: 0.30,
        controlledPricePerUnit: 0.21,
        feedbackPricePerUnit: 0.15,
        installationCost: 23000
    });

    async function initialize() {
        const loadingData = {
            hourlyUsageByMonth: await getHourlyUsageByMonth(),
            hourlyIrradianceByMonth: await getHourlyIrradianceByMonth()
        };

        setLoadingData(loadingData);
    }

    async function refresh() {
        if (loadingData === null) {
            return;
        }

        const hourlyMeasurementsByMonth = getHourlyMeasurementsByMonth(
            solarConfig,
            loadingData.hourlyIrradianceByMonth,
            loadingData.hourlyUsageByMonth);

        setCalculatedData({
            hourlyMeasurementsByMonth,
            cumulativeHourlyMeasurementsByMonth: getCumulativeHourlyMeasurementsByMonth(hourlyMeasurementsByMonth),
            annualMeasurements: getAnnualMeasurements(hourlyMeasurementsByMonth)
        });
    }

    useEffect(() => {initialize()}, []);
    useEffect(() => {refresh()}, [loadingData, solarConfig, pricingConfig]);

    function handleSolarConfigUpdate(config: SolarConfiguration) {
        setSolarConfig(config);
    }

    function handlePricingConfigUpdate(config: PricingConfiguration) {
        setPricingConfig(config);
    }

    function handleDisplayCumulativeChange() {
        setDisplayCumulative(!displayCumulative);
    }

    function getTotalGridUsage(data: CalculatedData, monthIndex: number) {
        return getSumOfHourlyDataRanges(
            data.hourlyMeasurementsByMonth.phase1GridUsageKWh[monthIndex],
            data.hourlyMeasurementsByMonth.phase2GridUsageKWh[monthIndex],
            data.hourlyMeasurementsByMonth.phase3GridUsageKWh[monthIndex],
            data.hourlyMeasurementsByMonth.controlledGridUsageKWh[monthIndex]);
    }

    function getTotalCumulativeGridUsage(data: CalculatedData, monthIndex: number) {
        return getSumOfHourlyDataRanges(
            data.cumulativeHourlyMeasurementsByMonth.phase1GridUsageKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.phase2GridUsageKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.phase3GridUsageKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.controlledGridUsageKWh[monthIndex]);
    }

    function getTotalSolarUsage(data: CalculatedData, monthIndex: number) {
        return getSumOfHourlyDataRanges(
            data.hourlyMeasurementsByMonth.phase1SolarUsageKWh[monthIndex],
            data.hourlyMeasurementsByMonth.phase2SolarUsageKWh[monthIndex],
            data.hourlyMeasurementsByMonth.phase3SolarUsageKWh[monthIndex]);
    }

    function getTotalCumulativeSolarUsage(data: CalculatedData, monthIndex: number) {
        return getSumOfHourlyDataRanges(
            data.cumulativeHourlyMeasurementsByMonth.phase1SolarUsageKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.phase2SolarUsageKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.phase3SolarUsageKWh[monthIndex]);
    }

    function getTotalExported(data: CalculatedData, monthIndex: number) {
        return getSumOfHourlyDataRanges(
            data.hourlyMeasurementsByMonth.phase1ExportedKWh[monthIndex],
            data.hourlyMeasurementsByMonth.phase2ExportedKWh[monthIndex],
            data.hourlyMeasurementsByMonth.phase3ExportedKWh[monthIndex]);
    }

    function getTotalCumulativeExported(data: CalculatedData, monthIndex: number) {
        return getSumOfHourlyDataRanges(
            data.cumulativeHourlyMeasurementsByMonth.phase1ExportedKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.phase2ExportedKWh[monthIndex],
            data.cumulativeHourlyMeasurementsByMonth.phase3ExportedKWh[monthIndex]);
    }

    return (
        calculatedData === null ? <p>Loading</p> :
        <div id="app">
            <Config
                solar={solarConfig}
                pricing={pricingConfig}
                handleSolarConfigUpdate={handleSolarConfigUpdate}
                handlePricingConfigUpdate={handlePricingConfigUpdate}
            />
            <br/>

            {getSummary(pricingConfig, calculatedData)}

            <h2>Charts</h2>
            {/* https://medium.com/front-end-weekly/creating-a-toggle-switch-in-css-2d23e496d035 */}
            <input type="checkbox" id="toggle-cumulative" className="toggle" checked={displayCumulative} onChange={handleDisplayCumulativeChange} />
            <label htmlFor="toggle-cumulative" className="toggle-label"></label>
            <label htmlFor="toggle-cumulative">Cumulative</label>
            
            <h3>Total Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.totalUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly usage (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.totalUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative usage (kW)' viewDimensions={viewDimensions} />}

            <h3>Total Grid Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => getTotalGridUsage(calculatedData, i)} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => getTotalCumulativeGridUsage(calculatedData, i)} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h4>Phase 1 Usage</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.phase1GridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.phase1GridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h4>Phase 2 Usage</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.phase2GridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.phase2GridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h4>Phase 3 Usage</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.phase3GridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.phase3GridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h4>Controlled Usage</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.controlledGridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.controlledGridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h3>Panel Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => getTotalSolarUsage(calculatedData, i)} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => getTotalCumulativeSolarUsage(calculatedData, i)} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h3>Battery Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.batteryUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.batteryUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h3>Generated</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.generationKWh[i]} propertyDisplayName='Output' yAxisDescription='Hourly generation (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.generationKWh[i]} propertyDisplayName='Output' yAxisDescription='Cumulative generation (kW)' viewDimensions={viewDimensions} />}

            <h3>Battery Storage</h3>
            <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.batteryLevelKWh[i]} propertyDisplayName='Battery Level' yAxisDescription='Hourly level (kWh)' viewDimensions={viewDimensions} />

            <h3>Exported</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => getTotalExported(calculatedData, i)} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => getTotalCumulativeExported(calculatedData, i)} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}

            <h4>Phase 1 Exported</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.phase1ExportedKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.phase1ExportedKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}

            <h4>Phase 2 Exported</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.phase2ExportedKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.phase2ExportedKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}

            <h4>Phase 3 Exported</h4>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.phase3ExportedKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.phase3ExportedKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}
        </div>
    )
}

function getSumOfHourlyDataRanges(...ranges: number[][]) {
    return ranges.reduce((sumRange, currentRange) => {
        return sumRange.map((val, i) => val + currentRange[i]);
    }, Array(24).fill(0));
}

function getSummary(pricingConfig: PricingConfiguration, calculatedData: CalculatedData) {
    const annualUsageKWh = calculatedData.annualMeasurements.totalUsageKWh;
    const annualCostWithoutSolar = annualUsageKWh * pricingConfig.gridPricePerUnit;
    const annualGridUsage =
        calculatedData.annualMeasurements.controlledGridUsageKWh +
        calculatedData.annualMeasurements.phase1GridUsageKWh +
        calculatedData.annualMeasurements.phase2GridUsageKWh +
        calculatedData.annualMeasurements.phase3GridUsageKWh;
    const annualGridCost = annualGridUsage * pricingConfig.gridPricePerUnit;
    const annualPanelUsage =
        calculatedData.annualMeasurements.phase1SolarUsageKWh +
        calculatedData.annualMeasurements.phase2SolarUsageKWh +
        calculatedData.annualMeasurements.phase3SolarUsageKWh;
    const annualBatteryUsage = calculatedData.annualMeasurements.batteryUsageKWh;
    const annualFeedback =
        calculatedData.annualMeasurements.phase1ExportedKWh +
        calculatedData.annualMeasurements.phase2ExportedKWh +
        calculatedData.annualMeasurements.phase3ExportedKWh;
    const annualFeedbackAmount = annualFeedback * pricingConfig.feedbackPricePerUnit;
    const annualCostWithSolar = annualGridCost - annualFeedbackAmount;
    const annualSaving = annualCostWithoutSolar - annualCostWithSolar;
    const timeToRecoupCost = pricingConfig.installationCost / annualSaving;

    return (
    <>
        <h3>Units</h3>
        <dl>
            <dt>Annual usage</dt>
            <dd>{Math.round(annualUsageKWh)} kWh</dd>

            <dt>Annual usage from grid</dt>
            <dd>{Math.round(annualGridUsage)} kWh</dd>

            <dt>Annual usage from panels</dt>
            <dd>{Math.round(annualPanelUsage)} kWh</dd>

            <dt>Annual usage from battery</dt>
            <dd>{Math.round(annualBatteryUsage)} kWh</dd>

            <dt>Annual feedback with solar</dt>
            <dd>{Math.round(annualFeedback)} kWh</dd>
         </dl>
        <h3>Cost</h3>
        <dl>
            <dt>Annual grid cost</dt>
            <dd>{Math.round(annualGridUsage)} kWh x ${pricingConfig.gridPricePerUnit}/kWh = ${Math.round(annualGridCost)}</dd>

            <dt>Annual resale earnings</dt>
            <dd>{Math.round(annualFeedback)} kWh x ${pricingConfig.feedbackPricePerUnit}/kWh = ${Math.round(annualFeedbackAmount)}</dd>

            <dt>Annual cost with solar</dt>
            <dd>${Math.round(annualGridCost)} - ${Math.round(annualFeedbackAmount)} = ${Math.round(annualCostWithSolar)}</dd>

            <dt>Annual cost without solar</dt>
            <dd>{Math.round(annualUsageKWh)} kWh x ${pricingConfig.gridPricePerUnit}/kWh = ${Math.round(annualCostWithoutSolar)}</dd>

            <dt>Annual saving with solar</dt>
            <dd>${Math.round(annualCostWithoutSolar)} - ${Math.round(annualCostWithSolar)} = ${Math.round(annualSaving)}</dd>

            <dt>Time to recoup cost</dt>
            <dd>${pricingConfig.installationCost} / ${Math.round(annualSaving)} = {Math.round(timeToRecoupCost)} years</dd>
        </dl>
    </>
    );
}