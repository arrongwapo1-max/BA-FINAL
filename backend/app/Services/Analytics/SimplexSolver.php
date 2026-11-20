<?php

namespace App\Services\Analytics;

use InvalidArgumentException;

class SimplexSolver
{
    private const EPSILON = 1.0e-9;

    private array $basis = [];

    private array $nonBasis = [];

    private array $tableau = [];

    private int $constraintCount;

    private int $variableCount;

    public function __construct(array $matrix, array $bounds, array $objective)
    {
        $this->constraintCount = count($bounds);
        $this->variableCount = count($objective);

        if ($this->constraintCount === 0 || count($matrix) !== $this->constraintCount) {
            throw new InvalidArgumentException('The linear program must include constraints.');
        }

        foreach ($matrix as $row) {
            if (count($row) !== $this->variableCount) {
                throw new InvalidArgumentException('Every constraint must match the objective variable count.');
            }
        }

        $m = $this->constraintCount;
        $n = $this->variableCount;
        $this->tableau = array_fill(0, $m + 2, array_fill(0, $n + 2, 0.0));

        for ($i = 0; $i < $m; $i++) {
            for ($j = 0; $j < $n; $j++) {
                $this->tableau[$i][$j] = (float) $matrix[$i][$j];
            }
            $this->basis[$i] = $n + $i;
            $this->tableau[$i][$n] = -1.0;
            $this->tableau[$i][$n + 1] = (float) $bounds[$i];
        }

        for ($j = 0; $j < $n; $j++) {
            $this->nonBasis[$j] = $j;
            $this->tableau[$m][$j] = -(float) $objective[$j];
        }

        $this->nonBasis[$n] = -1;
        $this->tableau[$m + 1][$n] = 1.0;
    }

    public function solve(): array
    {
        $m = $this->constraintCount;
        $n = $this->variableCount;
        $row = 0;

        for ($i = 1; $i < $m; $i++) {
            if ($this->tableau[$i][$n + 1] < $this->tableau[$row][$n + 1]) {
                $row = $i;
            }
        }

        if ($this->tableau[$row][$n + 1] < -self::EPSILON) {
            $this->pivot($row, $n);
            if (! $this->runSimplex(1) || $this->tableau[$m + 1][$n + 1] < -self::EPSILON) {
                return ['status' => 'infeasible'];
            }

            if (abs($this->tableau[$m + 1][$n + 1]) > self::EPSILON) {
                return ['status' => 'infeasible'];
            }

            foreach ($this->basis as $i => $basicVariable) {
                if ($basicVariable !== -1) {
                    continue;
                }

                $column = 0;
                for ($j = 1; $j <= $n; $j++) {
                    if ($this->tableau[$i][$j] < $this->tableau[$i][$column] - self::EPSILON
                        || (abs($this->tableau[$i][$j] - $this->tableau[$i][$column]) <= self::EPSILON
                            && $this->nonBasis[$j] < $this->nonBasis[$column])) {
                        $column = $j;
                    }
                }

                if (abs($this->tableau[$i][$column]) > self::EPSILON) {
                    $this->pivot($i, $column);
                }
            }
        }

        if (! $this->runSimplex(2)) {
            return ['status' => 'unbounded'];
        }

        $values = array_fill(0, $n, 0.0);
        foreach ($this->basis as $i => $basicVariable) {
            if ($basicVariable >= 0 && $basicVariable < $n) {
                $values[$basicVariable] = $this->tableau[$i][$n + 1];
            }
        }

        return [
            'status' => 'optimal',
            'objective' => $this->tableau[$m][$n + 1],
            'variables' => $values,
        ];
    }

    private function pivot(int $row, int $column): void
    {
        $m = $this->constraintCount;
        $n = $this->variableCount;
        $inverse = 1.0 / $this->tableau[$row][$column];

        for ($i = 0; $i < $m + 2; $i++) {
            if ($i === $row) {
                continue;
            }
            for ($j = 0; $j < $n + 2; $j++) {
                if ($j !== $column) {
                    $this->tableau[$i][$j] -= $this->tableau[$row][$j] * $this->tableau[$i][$column] * $inverse;
                }
            }
        }

        for ($j = 0; $j < $n + 2; $j++) {
            if ($j !== $column) {
                $this->tableau[$row][$j] *= $inverse;
            }
        }

        for ($i = 0; $i < $m + 2; $i++) {
            if ($i !== $row) {
                $this->tableau[$i][$column] *= -$inverse;
            }
        }

        $this->tableau[$row][$column] = $inverse;
        [$this->basis[$row], $this->nonBasis[$column]] = [$this->nonBasis[$column], $this->basis[$row]];
    }

    private function runSimplex(int $phase): bool
    {
        $m = $this->constraintCount;
        $n = $this->variableCount;
        $objectiveRow = $phase === 1 ? $m + 1 : $m;

        while (true) {
            $column = null;
            for ($j = 0; $j <= $n; $j++) {
                if ($phase === 2 && $this->nonBasis[$j] === -1) {
                    continue;
                }
                if ($column === null
                    || $this->tableau[$objectiveRow][$j] < $this->tableau[$objectiveRow][$column] - self::EPSILON
                    || (abs($this->tableau[$objectiveRow][$j] - $this->tableau[$objectiveRow][$column]) <= self::EPSILON
                        && $this->nonBasis[$j] < $this->nonBasis[$column])) {
                    $column = $j;
                }
            }

            if ($column === null || $this->tableau[$objectiveRow][$column] >= -self::EPSILON) {
                return true;
            }

            $row = null;
            for ($i = 0; $i < $m; $i++) {
                if ($this->tableau[$i][$column] <= self::EPSILON) {
                    continue;
                }

                $ratio = $this->tableau[$i][$n + 1] / $this->tableau[$i][$column];
                $currentRatio = $row === null ? INF : $this->tableau[$row][$n + 1] / $this->tableau[$row][$column];
                if ($row === null || $ratio < $currentRatio - self::EPSILON
                    || (abs($ratio - $currentRatio) <= self::EPSILON && $this->basis[$i] < $this->basis[$row])) {
                    $row = $i;
                }
            }

            if ($row === null) {
                return false;
            }

            $this->pivot($row, $column);
        }
    }
}