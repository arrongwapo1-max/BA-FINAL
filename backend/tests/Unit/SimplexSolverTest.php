<?php

namespace Tests\Unit;

use App\Services\Analytics\SimplexSolver;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SimplexSolverTest extends TestCase
{
    public function test_it_finds_the_optimum_of_a_bounded_linear_program(): void
    {
        $result = (new SimplexSolver(
            [[1, 1], [1, 0], [0, 1]],
            [4, 2, 3],
            [3, 2],
        ))->solve();

        $this->assertSame('optimal', $result['status']);
        $this->assertEqualsWithDelta(10, $result['objective'], 1.0e-7);
        $this->assertEqualsWithDelta(2, $result['variables'][0], 1.0e-7);
        $this->assertEqualsWithDelta(2, $result['variables'][1], 1.0e-7);
    }

    public function test_it_identifies_an_infeasible_linear_program(): void
    {
        $result = (new SimplexSolver(
            [[1], [-1]],
            [1, -2],
            [1],
        ))->solve();

        $this->assertSame('infeasible', $result['status']);
    }
}