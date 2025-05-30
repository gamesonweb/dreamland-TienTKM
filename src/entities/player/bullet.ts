import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    ArcRotateCamera,
    Mesh,
    PhysicsBody,
    PhysicsMotionType,
    PhysicsShapeMesh,
    PhysicsShapeSphere,
    IPhysicsCollisionEvent,
} from "@babylonjs/core";
import { Entity } from "../entity";

/**
 * Bullet projectile class.
 */
export class Bullet extends Entity {
    public _scene: Scene;
    public _mesh: Mesh;
    public _body: PhysicsBody;
    private damage: number;

    constructor(scene: Scene, position: Vector3, direction: Vector3, damage: number) {
        super("bullet", scene);
        this._scene = scene;
        this._isLethal = true;
        this._isLethalPlayer = false;
        this._isLethalEnemy = true; // Bullets can damage enemies
        this.damage = damage;
        // Create bullet mesh
        this._mesh = MeshBuilder.CreateSphere("bullet", { diameter: Bullet.DIAMETER }, this._scene);
        this._mesh.position.copyFrom(position);
        this._mesh.metadata = { entity: this };

        // Material
        const mat = new StandardMaterial("bulletMat", this._scene);
        mat.diffuseColor = Bullet.COLOR;
        this._mesh.material = mat;

        // Physics
        const shape = new PhysicsShapeSphere(Vector3.Zero(), Bullet.DIAMETER / 2, this._scene);
        this._body = new PhysicsBody(this._mesh, PhysicsMotionType.DYNAMIC, false, this._scene);
        this._body.shape = shape;
        this._body.setMassProperties({ mass: Bullet.MASS });

        // Launch
        const impulse = direction.normalize().scale(Bullet.SPEED);
        this._body.applyImpulse(impulse, this._mesh.getAbsolutePosition());

        // Dispose bullet on physics collision
        this._body?.getCollisionObservable()?.add((event: IPhysicsCollisionEvent) => {
            if (event.type !== "COLLISION_STARTED") return;

            const otherTransform = event.collidedAgainst?.transformNode;
            if (!otherTransform) return;

            // Optionally, ignore self-collision
            if (otherTransform === this._mesh) return;

            // Dispose bullet on any collision
            this.dispose();
        });

        // Schedule disposal
        setTimeout(() => this.dispose(), Bullet.LIFETIME);
    }

    public dispose(): void {
        this._body?.dispose();
        this._mesh?.dispose();
    }

    // Constants
    private static readonly SPEED = 50;
    private static readonly LIFETIME = 500; // ms
    private static readonly DIAMETER = 0.2;
    private static readonly MASS = 0.1;
    private static readonly COLOR = new Color3(1, 1, 0);
}
