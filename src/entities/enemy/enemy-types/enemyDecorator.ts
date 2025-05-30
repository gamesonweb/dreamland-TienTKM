import { Enemy } from "../enemy";
// DOES NOT WORK, DO NOT USE
export abstract class EnemyDecorator extends Enemy {
    protected _wrapped: Enemy;

    constructor(enemy: Enemy) {
        super(enemy.name, enemy._scene, enemy._player, enemy.position, enemy.damage, enemy.health);
        this._wrapped = enemy;
    }

    public override update(): void {
        this._wrapped.update();
    }
}