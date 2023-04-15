import './App.css'
import { MonthlyData, PricingConfiguration, SolarConfiguration, SummaryData, ViewDimensions } from './types'
import { getMonthlyData, getSummaryData } from './data'
import { MonthlyChart } from './MonthlyChart'
import { useEffect, useState } from 'react';
import { Config } from './Config';

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

export default function App() {
    const [data, setData] = useState<MonthlyData | null>(null);
    const [summary, setSummary] = useState<SummaryData | null>(null);

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

    async function refresh() {
        const monthlyData = await getMonthlyData(solarConfig);
        setData(monthlyData);

        const summaryData = getSummaryData(pricingConfig, monthlyData.hourlyData);
        setSummary(summaryData);
    }

    useEffect(() => {refresh()}, []);

    function handleSolarConfigUpdate(config: SolarConfiguration) {
        setSolarConfig(config);
        refresh();
    }

    function handlePricingConfigUpdate(config: PricingConfiguration) {
        setPricingConfig(config);
        refresh();
    }

    return (
        data === null || summary === null ? <p>Loading</p> :
        <div id="app">
            <Config
                solar={solarConfig}
                pricing={pricingConfig}
                handleSolarConfigUpdate={handleSolarConfigUpdate}
                handlePricingConfigUpdate={handlePricingConfigUpdate}
            />
            <button onClick={refresh}>Refresh</button>

            <h2>Usage</h2>
            <MonthlyChart monthlyValuesRetriever={i => data.hourlyData[i].hourlyUsage} propertyDisplayName='Usage' yAxisDescription='Hourly usage (kW)' viewDimensions={viewDimensions} />
            <MonthlyChart monthlyValuesRetriever={i => data.cumulativeData[i].hourlyUsage} propertyDisplayName='Usage' yAxisDescription='Cumulative usage (kW)' viewDimensions={viewDimensions} />

            <h2>Generated</h2>
            <MonthlyChart monthlyValuesRetriever={i => data.hourlyData[i].hourlyGeneration} propertyDisplayName='Output' yAxisDescription='Hourly generation (kW)' viewDimensions={viewDimensions} />
            <MonthlyChart monthlyValuesRetriever={i => data.cumulativeData[i].hourlyGeneration} propertyDisplayName='Output' yAxisDescription='Cumulative generation (kW)' viewDimensions={viewDimensions} />

            <h2>Grid Requirement</h2>
            <MonthlyChart monthlyValuesRetriever={i => data.hourlyData[i].hourlyGridRequirement} propertyDisplayName='Draw' yAxisDescription='Hourly draw (kW)' viewDimensions={viewDimensions} />
            <MonthlyChart monthlyValuesRetriever={i => data.cumulativeData[i].hourlyGridRequirement} propertyDisplayName='Draw' yAxisDescription='Cumulative draw (kW)' viewDimensions={viewDimensions} />

            <h2>Battery Storage</h2>
            <MonthlyChart monthlyValuesRetriever={i => data.hourlyData[i].hourlyBatteryLevels} propertyDisplayName='Battery Level' yAxisDescription='Hourly level (kWh)' viewDimensions={viewDimensions} />

            <h2>Feedback</h2>
            <MonthlyChart monthlyValuesRetriever={i => data.hourlyData[i].hourlyFeedback} propertyDisplayName='Output' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />
            <MonthlyChart monthlyValuesRetriever={i => data.cumulativeData[i].hourlyFeedback} propertyDisplayName='Output' yAxisDescription='Hourly feedback (kW)' viewDimensions={viewDimensions} />

            <h2>Calculations</h2>
            <dl>
                <dt>Annual usage</dt>
                <dd>{Math.round(summary.annualUsage)} kWh</dd>

                <dt>Annual cost without solar</dt>
                <dd>{Math.round(summary.annualUsage)} kWh x ${pricingConfig.gridPricePerUnit}/kWh = ${Math.round(summary.annualCostWithoutSolar)}</dd>

                <dt>Annual grid requirement with solar</dt>
                <dd>{Math.round(summary.annualGridRequirement)} kWh</dd>

                <dt>Annual grid cost with solar</dt>
                <dd>{Math.round(summary.annualGridRequirement)} kWh x ${pricingConfig.gridPricePerUnit}/kWh = ${Math.round(summary.annualGridCost)}</dd>

                <dt>Annual feedback with solar</dt>
                <dd>{Math.round(summary.annualFeedback)} kWh</dd>

                <dt>Annual feedback amount with solar</dt>
                <dd>{Math.round(summary.annualFeedback)} kWh x ${pricingConfig.feedbackPricePerUnit}/kWh = ${Math.round(summary.annualFeedbackAmount)}</dd>

                <dt>Annual cost with solar</dt>
                <dd>${Math.round(summary.annualGridCost)} - ${Math.round(summary.annualFeedbackAmount)} = ${Math.round(summary.annualCostWithSolar)}</dd>

                <dt>Annual saving with solar</dt>
                <dd>${Math.round(summary.annualCostWithoutSolar)} - ${Math.round(summary.annualCostWithSolar)} = ${Math.round(summary.annualSaving)}</dd>

                <dt>Time to recoup cost</dt>
                <dd>${pricingConfig.installationCost} / ${Math.round(summary.annualSaving)} = {Math.round(summary.timeToRecoupCost)} years</dd>
            </dl>
        </div>
    )
}
