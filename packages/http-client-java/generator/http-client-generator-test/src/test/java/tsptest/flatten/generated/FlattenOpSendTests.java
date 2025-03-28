// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) TypeSpec Code Generator.

package tsptest.flatten.generated;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import tsptest.flatten.models.User;

@Disabled
public final class FlattenOpSendTests extends FlattenClientTestBase {
    @Test
    @Disabled
    public void testFlattenOpSendTests() {
        // method invocation
        flattenClient.send("myRequiredId", null, "myRequiredInput", 0, 50, new User("myOptionalUser"));
    }
}
