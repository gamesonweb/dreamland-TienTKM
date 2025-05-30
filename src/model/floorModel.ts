import { Color3, Vector3 } from "@babylonjs/core/Maths/math";

export class FloorModel{

    public readonly name: string;
    public readonly size: Vector3;
    public readonly position: Vector3;
    public readonly color: Color3 = new Color3(1, 1, 1);

    public static readonly FLOOR_THICKNESS = 0.1;
    public static readonly FLOOR_DEPTH_OFFSET = -0.05;

    constructor(name: string, size: Vector3, position: Vector3, color: Color3) {
        this.name = name;
        this.size = size;
        this.position = position;
        this.color = color;
    }

}