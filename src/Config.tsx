import { PricingConfiguration, SolarConfiguration } from "./types"

export interface ConfigProps {
    solar: SolarConfiguration
    pricing: PricingConfiguration
    handleSolarConfigUpdate: (config: SolarConfiguration) => void
    handlePricingConfigUpdate: (config: PricingConfiguration) => void
}

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
                Single panel area (sqm):
                <input
                    type='number'
                    step="0.01"
                    min="0"
                    value={props.solar.singlePanelAreaSqm}
                    onChange={e => props.handleSolarConfigUpdate({
                        ...props.solar,
                        singlePanelAreaSqm: parseFloat(e.target.value)
                    })}
                />
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