import { PhaseConfigurationOption, PricingConfiguration, SolarConfiguration, WaterCylinderSource } from "./types"

export interface ConfigProps {
    solar: SolarConfiguration
    pricing: PricingConfiguration
    handleSolarConfigUpdate: (config: SolarConfiguration) => void
    handlePricingConfigUpdate: (config: PricingConfiguration) => void
}

const waterCylinderSourceDisplayNames: Record<keyof typeof WaterCylinderSource, string> = {
    Grid: "Grid (controlled)",
    Phase1: "Phase 1",
    Phase2: "Phase 2",
    Phase3: "Phase 3"
};

const phaseConfigurationDisplayNames: Record<keyof typeof PhaseConfigurationOption, string> = {
    SinglePhase1Inverter: "Single Phase Inverter => 1",
    SinglePhase2Inverter: "Single Phase Inverter => 2",
    SinglePhase3Inverter: "Single Phase Inverter => 3",
    ThreePhaseInverterEqualDistribution: "Three Phase Inverter - Equal Distribution",
    ThreePhaseInverterBalanced: "Three Phase Inverter - Dynamic Phase Balancing"
};

export function Config(props: ConfigProps) {
    const totalPanelCount = props.solar.northWestNumberOfPanels + props.solar.northEastNumberOfPanels;
    const totalSystemSize = totalPanelCount * props.solar.panelRatingW / 1000;

    return (
    <form>
        <h3>Solar Configuration</h3>
        <div>
            <label>
                # of panels (NW):
                <input
                    type='number'
                    step="1"
                    min="0"
                    value={props.solar.northWestNumberOfPanels}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        northWestNumberOfPanels: parseInt(e.target.value)
                    })}
                />
            </label>
        </div>
        <div>
            <label>
                # of panels (NE):
                <input
                    type='number'
                    step="1"
                    min="0"
                    value={props.solar.northEastNumberOfPanels}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        northEastNumberOfPanels: parseInt(e.target.value)
                    })}
                />
            </label>
        </div>
        <div>
            <label>
                Panel rating (W):
                <input
                    type='number'
                    step="1"
                    min="0"
                    value={props.solar.panelRatingW}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        panelRatingW: parseInt(e.target.value)
                    })}
                />
            </label>
        </div>
        <div>
            <label>
                Water Cylinder Source:
                <select
                    value={WaterCylinderSource[props.solar.waterCylinderSource]}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        waterCylinderSource: WaterCylinderSource[e.target.value as keyof typeof WaterCylinderSource]
                    })}
                >
                    {Object.keys(waterCylinderSourceDisplayNames).map(k => (
                        <option key={k} value={k}>{waterCylinderSourceDisplayNames[k as keyof typeof WaterCylinderSource]}</option>
                    ))}
                </select>
            </label>
        </div>
        <div>
            <label>
                Phase Configuration:
                <select
                    value={PhaseConfigurationOption[props.solar.phaseConfiguration]}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        phaseConfiguration: PhaseConfigurationOption[e.target.value as keyof typeof PhaseConfigurationOption]
                    })}
                >
                    {Object.keys(phaseConfigurationDisplayNames).map(k => (
                        <option key={k} value={k}>{phaseConfigurationDisplayNames[k as keyof typeof PhaseConfigurationOption]}</option>
                    ))}
                </select>
            </label>
        </div>
        <div>
            <label>
                Battery size (kWh):
                <input
                    type='number'
                    step="0.1"
                    min="0"
                    value={props.solar.batteryCapacityKWh}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        batteryCapacityKWh: parseFloat(e.target.value)
                    })}
                />
            </label>
        </div>
        <p>
            Total system size: {totalSystemSize} kW
        </p>

        <h3>Pricing Configuration</h3>
        <div>
            <label>
                Grid price per unit ($):
                <input
                    type='number'
                    step="0.01"
                    min="0"
                    value={props.pricing.gridPricePerUnit}
                    onChange={e => props.handlePricingConfigUpdate({
                        ...props.pricing,
                        gridPricePerUnit: parseFloat(e.target.value)
                    })}
                />
            </label>
        </div>
        <div>
            <label>
                Feedback price per unit ($):
                <input
                    type='number'
                    step="0.01"
                    min="0"
                    value={props.pricing.feedbackPricePerUnit}
                    onChange={e => props.handlePricingConfigUpdate({
                        ...props.pricing,
                        feedbackPricePerUnit: parseFloat(e.target.value)
                    })}
                />
            </label>
        </div>
        <div>
            <label>
                Installation cost ($):
                <input
                    type='number'
                    step="1"
                    min="0"
                    value={props.pricing.installationCost}
                    onChange={e => props.handlePricingConfigUpdate({
                        ...props.pricing,
                        installationCost: parseInt(e.target.value)
                    })}
                />
            </label>
        </div>
    </form>
    );
}