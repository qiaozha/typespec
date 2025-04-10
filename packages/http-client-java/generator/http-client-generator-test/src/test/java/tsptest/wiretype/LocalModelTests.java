// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package tsptest.wiretype;

import com.azure.core.util.BinaryData;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class LocalModelTests {

    @Test
    public void testLocalModel() {
        OffsetDateTime now = OffsetDateTime.now().withNano(0).withOffsetSameInstant(ZoneOffset.UTC);

        Model model = new Model(now);
        BinaryData json = BinaryData.fromObject(model);

        Model model1 = json.toObject(Model.class);
        Assertions.assertEquals(now, model1.getDateTimeRfc7231());
    }
}
