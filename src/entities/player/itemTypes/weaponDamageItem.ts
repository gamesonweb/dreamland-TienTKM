import { Scene } from "@babylonjs/core";
import { Item } from "../items";
import { Player } from "../player";

export class WeaponDamageItem extends Item {
    public readonly iconName: string = "damage-up.png";
    private weaponType: "basic" | "burst" | "focus" | "rapid";
    constructor(scene: Scene, weaponType: "basic" | "burst" | "focus" | "rapid") {
        super(`Upgrade ${weaponType} Damage`, scene);
        this.weaponType = weaponType;
    }

    public use(player: Player): boolean {
        if (!player["weaponDamageBonus"]) player["weaponDamageBonus"] = {};
        if (!player["weaponDamageBonus"][this.weaponType]) player["weaponDamageBonus"][this.weaponType] = 0;
        switch (this.weaponType) {
            case "basic":
                player["weaponDamageBonus"][this.weaponType] += 5;
                break;
            case "burst":
            case "rapid":
                player["weaponDamageBonus"][this.weaponType] += 2;
                break;
            case "focus":
                player["weaponDamageBonus"][this.weaponType] += 10;
                break;
        }
        player.view.showNotification(
            `${this.weaponType} damage increased!`,
            "#4caf50",
            8000 // Show for 8 seconds
        );
        return true;
    }
}