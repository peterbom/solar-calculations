import { AnnualMeasurements, HourlyIrradianceByMonth, HourlyMeasurementsByMonth, HourlyMeasurementsForSingleMonth, HourlyUsageByMonth, HourlyUsageValue, SolarConfiguration, SummableHourlyMeasurementsByMonth } from "./types";
import moment from 'moment';
import { getSum } from './stats';

const monthDays = Array.from({length: 12}, (_, i) => moment(new Date(2001, i, 1)).daysInMonth());

export function getHourlyMeasurementsByMonth(
    solarConfiguration: SolarConfiguration,
    hourlyIrradianceByMonth: HourlyIrradianceByMonth,
    hourlyUsageByMonth: HourlyUsageByMonth
): HourlyMeasurementsByMonth {
    const northWestPanelArea = solarConfiguration.singlePanelAreaSqm * solarConfiguration.northWestNumberOfPanels;
    const northEastPanelArea = solarConfiguration.singlePanelAreaSqm * solarConfiguration.northEastNumberOfPanels;

    const efficiency = getPanelEfficiency(solarConfiguration);

    function getSingleMonthData(monthIndex: number): HourlyMeasurementsForSingleMonth {
        const usage = hourlyUsageByMonth[monthIndex];

        const northWestIrradiance = hourlyIrradianceByMonth.northWest[monthIndex];
        const northEastIrradiance = hourlyIrradianceByMonth.northEast[monthIndex];

        const northWestGeneration = northWestIrradiance.map(wPerSqm => getGenerationInKWh(wPerSqm, efficiency, northWestPanelArea));
        const northEastGeneration = northEastIrradiance.map(wPerSqm => getGenerationInKWh(wPerSqm, efficiency, northEastPanelArea));
        const generation = Array.from({ length: 24 }, (_, i) => northWestGeneration[i] + northEastGeneration[i]);

        const totalUsage = usage.map(u => u.controlled + u.uncontrolled);
        return getHourlyMeasurementsForSingleMonth(totalUsage, generation, solarConfiguration.batteryCapacityKWh);
    }

    const singleMonthMeasurements = Array.from({ length: 12 }, (_, monthIndex) => getSingleMonthData(monthIndex));
    return {
        usageKWh: singleMonthMeasurements.map(m => m.usageKWh),
        gridUsageKWh: singleMonthMeasurements.map(m => m.gridUsageKWh),
        panelUsageKWh: singleMonthMeasurements.map(m => m.panelUsageKWh),
        batteryUsageKWh: singleMonthMeasurements.map(m => m.batteryUsageKWh),
        generationKWh: singleMonthMeasurements.map(m => m.generationKWh),
        resoldKWh: singleMonthMeasurements.map(m => m.resoldKWh),
        batteryLevelKWh: singleMonthMeasurements.map(m => m.batteryLevelKWh)
    };
}

export function getCumulativeHourlyMeasurementsByMonth(data: SummableHourlyMeasurementsByMonth): SummableHourlyMeasurementsByMonth {
    return {
        usageKWh: data.usageKWh.map(accumulate),
        gridUsageKWh: data.gridUsageKWh.map(accumulate),
        panelUsageKWh: data.panelUsageKWh.map(accumulate),
        batteryUsageKWh: data.batteryUsageKWh.map(accumulate),
        generationKWh: data.generationKWh.map(accumulate),
        resoldKWh: data.resoldKWh.map(accumulate)
    };
}

export function getAnnualMeasurements(data: SummableHourlyMeasurementsByMonth): AnnualMeasurements {
    function getSumForMonth(hourlyMeasurements: number[], monthIndex: number): number {
        return monthDays[monthIndex] * getSum(hourlyMeasurements);
    }

    return {
        usageKWh: getSum(data.usageKWh.map(getSumForMonth)),
        gridUsageKWh: getSum(data.gridUsageKWh.map(getSumForMonth)),
        panelUsageKWh: getSum(data.panelUsageKWh.map(getSumForMonth)),
        batteryUsageKWh: getSum(data.batteryUsageKWh.map(getSumForMonth)),
        generationKWh: getSum(data.generationKWh.map(getSumForMonth)),
        resoldKWh: getSum(data.resoldKWh.map(getSumForMonth))
    }
}

function getHourlyMeasurementsForSingleMonth(usageKWh: number[], generationKWh: number[], batteryCapacityKWh: number): HourlyMeasurementsForSingleMonth {
    const gridUsageKWh = Array(24).fill(0);
    const panelUsageKWh = Array(24).fill(0);
    const batteryUsageKWh = Array(24).fill(0);
    const resoldKWh = Array(24).fill(0);
    const batteryLevelKWh = Array(24).fill(0);

    // Loop through twice, so that starting battery capacity accounts for the previous day.
    let batteryLevel = 0;
    for (let i = 0; i < 2; i++) {
        for (let hour = 0; hour < 24; hour++) {
            const used = usageKWh[hour];
            const generated = generationKWh[hour];
            if (used > generated) {
                const excessRequired = used - generated;
                const suppliedByBattery = Math.min(excessRequired, batteryLevel);
                batteryLevel -= suppliedByBattery;
                gridUsageKWh[hour] = excessRequired - suppliedByBattery;
                panelUsageKWh[hour] = generated;
                batteryUsageKWh[hour] = suppliedByBattery;
                resoldKWh[hour] = 0;
            } else {
                const surplus = generated - used;
                const availableToStore = batteryCapacityKWh - batteryLevel;
                const stored = Math.min(surplus, availableToStore);
                batteryLevel += stored;
                gridUsageKWh[hour] = 0;
                panelUsageKWh[hour] = used;
                batteryUsageKWh[hour] = 0;
                resoldKWh[hour] = surplus - stored;
            }

            batteryLevelKWh[hour] = batteryLevel;
        }
    }

    return {
        usageKWh,
        gridUsageKWh,
        panelUsageKWh,
        batteryUsageKWh,
        generationKWh,
        resoldKWh,
        batteryLevelKWh
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