import * as d3 from 'd3'
import { MonthlyData, MonthlyDataValues, NiwaSourceColumns, PowershopUsageColumns, PricingConfiguration, SolarConfiguration, SummaryData } from "./types";
import niwaNorthWestCsv from './assets/table_mhr_northwest.csv';
import niwaNorthEastCsv from './assets/table_mhr_northeast.csv';
import usageCsv from './assets/powershop_daily_usage.csv';
import moment from 'moment';

const monthDays = Array.from({length: 12}, (_, i) => moment(new Date(2001, i, 1)).daysInMonth());

export async function getMonthlyData(solarConfiguration: SolarConfiguration): Promise<MonthlyData> {
    const niwaNorthWestData = await d3.csv<NiwaSourceColumns>(niwaNorthWestCsv);
    const niwaNorthEastData = await d3.csv<NiwaSourceColumns>(niwaNorthEastCsv);
    const usageData = await d3.csv<PowershopUsageColumns>(usageCsv);

    const northWestHourlyIrradianceByMonth = toHourlyIrradianceByMonth(niwaNorthWestData);
    const northEastHourlyIrradianceByMonth = toHourlyIrradianceByMonth(niwaNorthEastData);
    const hourlyUsageByMonth = toHourlyUsageByMonth(usageData)

    const hourlyData = getHourlyData(
        solarConfiguration,
        northWestHourlyIrradianceByMonth,
        northEastHourlyIrradianceByMonth,
        hourlyUsageByMonth);

    const cumulativeData = hourlyData.map(monthData => ({
        hourlyUsage: accumulate(monthData.hourlyUsage),
        hourlyGeneration: accumulate(monthData.hourlyGeneration),
        hourlySolarUsage: accumulate(monthData.hourlySolarUsage),
        hourlyBatteryUsage: accumulate(monthData.hourlyBatteryUsage),
        hourlyGridRequirement: accumulate(monthData.hourlyGridRequirement),
        hourlyFeedback: accumulate(monthData.hourlyFeedback)
    }));

    return {
        hourlyData,
        cumulativeData
    };
}

export function getSummaryData(pricingConfig: PricingConfiguration, monthlyData: MonthlyDataValues[]): SummaryData {
    function getTotalYearlyData(monthlyValuesRetriever: (monthIndex: number) => number[]) {
        const totalsPerMonth = monthlyData.map((_, i) => {
            const valuesForMonth = monthlyValuesRetriever(i);
            return getSum(valuesForMonth) * monthDays[i];
        });
        return getSum(totalsPerMonth);
    }

    const annualUsage = getTotalYearlyData(i => monthlyData[i].hourlyUsage);
    const annualCostWithoutSolar = annualUsage * pricingConfig.gridPricePerUnit;
    const annualGridRequirement = getTotalYearlyData(i => monthlyData[i].hourlyGridRequirement);
    const annualGridCost = annualGridRequirement * pricingConfig.gridPricePerUnit;
    const annualFeedback = getTotalYearlyData(i => monthlyData[i].hourlyFeedback);
    const annualFeedbackAmount = annualFeedback * pricingConfig.feedbackPricePerUnit;
    const annualCostWithSolar = annualGridCost - annualFeedbackAmount;
    const annualSaving = annualCostWithoutSolar - annualCostWithSolar;
    const timeToRecoupCost = pricingConfig.installationCost / annualSaving;

    return {
        annualUsage,
        annualCostWithoutSolar,
        annualGridRequirement,
        annualGridCost,
        annualFeedback,
        annualFeedbackAmount,
        annualCostWithSolar,
        annualSaving,
        timeToRecoupCost
    };
}

function toHourlyIrradianceByMonth(niwaData: d3.DSVRowArray<NiwaSourceColumns>): number[][] {
    const result = Array.from({length: 12}, _ => Array<number>(24));
    for (const d of niwaData) {
        const [monthStr, timeStr] = d['Month & hour']!.split(' ').map(s => s.trim()).filter(s => s);
        const monthIndex = moment(monthStr, "MMM").month();
        const [hourStr, _] = timeStr.split(":");
        const hour = parseInt(hourStr);
        result[monthIndex][hour] = parseFloat(d['Hourly W/m2']!);
    }

    return result;
}

function toHourlyUsageByMonth(usageData: d3.DSVRowArray<PowershopUsageColumns>): number[][] {
    // Convert from half-hourly to hourly
    const hourlyUsages = usageData.map(d => ({
        month: moment(d.Date, "D/M/YYYY").month(),
        hourlyUsage: [
            parseFloat(d["00:00 - 00:30"]!) + parseFloat(d["00:30 - 01:00"]!) || 0,
            parseFloat(d["01:00 - 01:30"]!) + parseFloat(d["01:30 - 02:00"]!) || 0,
            parseFloat(d["02:00 - 02:30"]!) + parseFloat(d["02:30 - 03:00"]!) || 0,
            parseFloat(d["03:00 - 03:30"]!) + parseFloat(d["03:30 - 04:00"]!) || 0,
            parseFloat(d["04:00 - 04:30"]!) + parseFloat(d["04:30 - 05:00"]!) || 0,
            parseFloat(d["05:00 - 05:30"]!) + parseFloat(d["05:30 - 06:00"]!) || 0,
            parseFloat(d["06:00 - 06:30"]!) + parseFloat(d["06:30 - 07:00"]!) || 0,
            parseFloat(d["07:00 - 07:30"]!) + parseFloat(d["07:30 - 08:00"]!) || 0,
            parseFloat(d["08:00 - 08:30"]!) + parseFloat(d["08:30 - 09:00"]!) || 0,
            parseFloat(d["09:00 - 09:30"]!) + parseFloat(d["09:30 - 10:00"]!) || 0,
            parseFloat(d["10:00 - 10:30"]!) + parseFloat(d["10:30 - 11:00"]!) || 0,
            parseFloat(d["11:00 - 11:30"]!) + parseFloat(d["11:30 - 12:00"]!) || 0,
            parseFloat(d["12:00 - 12:30"]!) + parseFloat(d["12:30 - 13:00"]!) || 0,
            parseFloat(d["13:00 - 13:30"]!) + parseFloat(d["13:30 - 14:00"]!) || 0,
            parseFloat(d["14:00 - 14:30"]!) + parseFloat(d["14:30 - 15:00"]!) || 0,
            parseFloat(d["15:00 - 15:30"]!) + parseFloat(d["15:30 - 16:00"]!) || 0,
            parseFloat(d["16:00 - 16:30"]!) + parseFloat(d["16:30 - 17:00"]!) || 0,
            parseFloat(d["17:00 - 17:30"]!) + parseFloat(d["17:30 - 18:00"]!) || 0,
            parseFloat(d["18:00 - 18:30"]!) + parseFloat(d["18:30 - 19:00"]!) || 0,
            parseFloat(d["19:00 - 19:30"]!) + parseFloat(d["19:30 - 20:00"]!) || 0,
            parseFloat(d["20:00 - 20:30"]!) + parseFloat(d["20:30 - 21:00"]!) || 0,
            parseFloat(d["21:00 - 21:30"]!) + parseFloat(d["21:30 - 22:00"]!) || 0,
            parseFloat(d["22:00 - 22:30"]!) + parseFloat(d["22:30 - 23:00"]!) || 0,
            parseFloat(d["23:00 - 23:30"]!) + parseFloat(d["23:30 - 00:00"]!) || 0
        ]
    }));

    return Array.from({length: 12}, (_, monthIndex) => {
        const allDaysHourlyUsage = hourlyUsages.filter(u => u.month === monthIndex);
        return Array.from({length: 24}, (_, hour) => {
            const hourUsages = allDaysHourlyUsage.map(u => u.hourlyUsage[hour]);
            // TODO: Improve this adjustment
            return getAverage(hourUsages) * 1.8;
        });
    });
}

function getHourlyData(
    solarConfiguration: SolarConfiguration,
    northWestHourlyIrradianceByMonth: number[][],
    northEastHourlyIrradianceByMonth: number[][],
    hourlyUsageByMonth: number[][]
): MonthlyDataValues[] {
    const northWestPanelArea = solarConfiguration.singlePanelAreaSqm * solarConfiguration.northWestNumberOfPanels;
    const northEastPanelArea = solarConfiguration.singlePanelAreaSqm * solarConfiguration.northEastNumberOfPanels;

    const efficiency = getPanelEfficiency(solarConfiguration);

    function getSingleMonthData(monthIndex: number) {
        const usage = hourlyUsageByMonth[monthIndex];

        const northWestIrradiance = northWestHourlyIrradianceByMonth[monthIndex];
        const northEastIrradiance = northEastHourlyIrradianceByMonth[monthIndex];

        const northWestGeneration = northWestIrradiance.map(wPerSqm => getGenerationInKWh(wPerSqm, efficiency, northWestPanelArea));
        const northEastGeneration = northEastIrradiance.map(wPerSqm => getGenerationInKWh(wPerSqm, efficiency, northEastPanelArea));
        const generation = Array.from({ length: 24 }, (_, i) => northWestGeneration[i] + northEastGeneration[i]);

        return getDataValuesForMonth(usage, generation, solarConfiguration.batteryCapacityKWh);
    }

    return Array.from({ length: 12 }, (_, monthIndex) => getSingleMonthData(monthIndex));
}

function getDataValuesForMonth(usage: number[], generation: number[], batteryCapacityKWh: number): MonthlyDataValues {
    const hourlyGridRequirement = Array(24).fill(0);
    const hourlySolarUsage = Array(24).fill(0);
    const hourlyBatteryUsage = Array(24).fill(0);
    const hourlyFeedback = Array(24).fill(0);
    const hourlyBatteryLevels = Array(24).fill(0);

    // Loop through twice, so that starting battery capacity accounts for the previous day.
    let batteryLevel = 0;
    for (let i = 0; i < 2; i++) {
        for (let hour = 0; hour < 24; hour++) {
            const used = usage[hour];
            const generated = generation[hour];
            if (used > generated) {
                const suppliedByBattery = Math.min(used - generated, batteryLevel);
                batteryLevel -= suppliedByBattery;
                hourlyGridRequirement[hour] = used - generated - suppliedByBattery;
                hourlySolarUsage[hour] = 0;
                hourlyBatteryUsage[hour] = suppliedByBattery;
                hourlyFeedback[hour] = 0;
            } else {
                const surplus = generated - used;
                const stored = Math.min(surplus, batteryCapacityKWh - batteryLevel);
                batteryLevel += stored;
                hourlyGridRequirement[hour] = 0;
                hourlySolarUsage[hour] = used;
                hourlyBatteryUsage[hour] = 0;
                hourlyFeedback[hour] = generated - used - stored;
            }

            hourlyBatteryLevels[hour] = batteryLevel;
        }
    }

    return {
        hourlyUsage: usage,
        hourlyGeneration: generation,
        hourlyGridRequirement,
        hourlySolarUsage,
        hourlyBatteryUsage,
        hourlyFeedback,
        hourlyBatteryLevels
    };
}

function accumulate(values: number[]): number[] {
    let sum = 0;
    const result = [];
    for (const value of values) {
        sum += value;
        result.push(sum);
    }

    return result;
}

function getSum(values: number[]) {
    return values.reduce((a, b) => a + b);
}

function getAverage(values: number[]) {
    return getSum(values) / values.length;
}

function getGenerationInKWh(wPerSqm: number, maxEfficiency: number, panelArea: number) {
    const lowLightAdjustment =
        wPerSqm < 1 ? 0 :
        wPerSqm < 25 ? 0.3 :
        wPerSqm < 50 ? 0.6 :
        wPerSqm < 100 ? 0.87 :
        wPerSqm < 200 ? 0.94 :
        wPerSqm < 400 ? 0.98 :
        1;

    return wPerSqm * maxEfficiency * lowLightAdjustment * panelArea / 1000;
}

function getPanelEfficiency(solarConfiguration: SolarConfiguration) {
    // The panel rating is the number of Watts generated at 1000 W/sqm irradiance.
    const wattsSuppliedPerSqm = 1000;
    const wattsGeneratedPerSqm = solarConfiguration.panelRatingW / solarConfiguration.singlePanelAreaSqm;
    
    // The efficiency is Watts generated per Watt supplied (over the same area).
    return wattsGeneratedPerSqm / wattsSuppliedPerSqm;
}