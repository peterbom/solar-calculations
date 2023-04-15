import './App.css'
import { AnnualMeasurements, HourlyIrradianceByMonth, HourlyMeasurementsByMonth, HourlyUsageByMonth, PricingConfiguration, SolarConfiguration, SummableHourlyMeasurementsByMonth, ViewDimensions } from './types'
import { getAnnualMeasurements, getCumulativeHourlyMeasurementsByMonth, getHourlyMeasurementsByMonth } from './calculations'
import { MonthlyChart } from './MonthlyChart'
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
        batteryCapacityKWh: 5.4
    });

    const [pricingConfig, setPricingConfig] = useState<PricingConfiguration>({
        gridPricePerUnit: 0.26,
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

            <h2>Charts</h2>
            {/* https://medium.com/front-end-weekly/creating-a-toggle-switch-in-css-2d23e496d035 */}
            <input type="checkbox" id="toggle-cumulative" className="toggle" checked={displayCumulative} onChange={handleDisplayCumulativeChange} />
            <label htmlFor="toggle-cumulative" className="toggle-label"></label>
            <label htmlFor="toggle-cumulative">Cumulative</label>
            
            <h3>Total Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.usageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly usage (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.usageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative usage (kW)' viewDimensions={viewDimensions} />}

            <h3>Grid Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.gridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.gridUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h3>Panel Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.panelUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.panelUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h3>Battery Usage</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.batteryUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.batteryUsageKWh[i]} propertyDisplayName='Drawn' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />}

            <h3>Generated</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.generationKWh[i]} propertyDisplayName='Output' yAxisDescription='Hourly generation (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.generationKWh[i]} propertyDisplayName='Output' yAxisDescription='Cumulative generation (kW)' viewDimensions={viewDimensions} />}

            <h3>Battery Storage</h3>
            <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.batteryLevelKWh[i]} propertyDisplayName='Battery Level' yAxisDescription='Hourly level (kWh)' viewDimensions={viewDimensions} />

            <h3>Feedback</h3>
            {!displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.hourlyMeasurementsByMonth.resoldKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}
            {displayCumulative && <MonthlyChart monthlyValuesRetriever={i => calculatedData.cumulativeHourlyMeasurementsByMonth.resoldKWh[i]} propertyDisplayName='Sold' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />}

            <h2>Calculations</h2>
            {getSummary(pricingConfig, calculatedData)}
        </div>
    )
}

function getSummary(pricingConfig: PricingConfiguration, calculatedData: CalculatedData) {
    const annualUsageKWh = calculatedData.annualMeasurements.usageKWh;
    const annualCostWithoutSolar = annualUsageKWh * pricingConfig.gridPricePerUnit;
    const annualGridUsage = calculatedData.annualMeasurements.gridUsageKWh;
    const annualGridCost = annualGridUsage * pricingConfig.gridPricePerUnit;
    const annualPanelUsage = calculatedData.annualMeasurements.panelUsageKWh;
    const annualBatteryUsage = calculatedData.annualMeasurements.batteryUsageKWh;
    const annualFeedback = calculatedData.annualMeasurements.resoldKWh;
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